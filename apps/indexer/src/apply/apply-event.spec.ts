import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { applyEvent } from "./apply-event";
import { ChainReaderPort } from "../chain/chain-reader.port";
import { CancelledEvent, ListedEvent, SoldEvent, TransferEvent, ZERO_ADDRESS } from "../decode/types";

// Real Postgres (docker-compose), not mocked — each test runs inside a
// transaction that's always rolled back at the end (via deliberately
// throwing), so nothing persists to the shared dev database. That rollback
// only protects against *this test's own* rows leaking out, though — the
// dev DB also holds real data from manually-run Sepolia backfills (see
// docs/08-blockchain-indexer.md's rebuild-from-chain runbook), and every
// query below is scoped (by NFT_ADDRESS / a listingId far outside any real
// range) specifically so it can never read back a real row instead of the
// one this test just created. An earlier version of this file used
// unscoped findFirstOrThrow()/count() calls that happened to work only
// because the dev DB was empty at the time — once real data accumulated
// (same onchainListingId 0 as this file's original fixture, in fact), they
// started reading real rows and failing nondeterministically.
const prisma = new PrismaClient();

const NFT_ADDRESS = "0xnft00000000000000000000000000000001";
const SELLER = "0xseller0000000000000000000000000000001";
const BUYER = "0xbuyer00000000000000000000000000000001";
const ROYALTY_RECEIVER = "0xroyalty000000000000000000000000000001";
// Real Sepolia listingIds start at 0 and are unlikely to ever reach this
// range — see the file-level comment above.
const LISTING_ID = 9_000_000_000n;

class FakeChainReader implements ChainReaderPort {
  async getCollectionMetadata() {
    return { name: "Test NFT", symbol: "TNFT" };
  }
  async getTokenMetadata() {
    return { tokenUri: "ipfs://test/1", royaltyReceiver: ROYALTY_RECEIVER, royaltyBps: 500 };
  }
}

async function inRolledBackTransaction(fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
  const rollback = new Error("intentional rollback — not a real failure");
  await expect(
    prisma.$transaction(async (tx) => {
      await fn(tx);
      throw rollback;
    }),
  ).rejects.toBe(rollback);
}

afterAll(async () => {
  await prisma.$disconnect();
});

function mintEvent(overrides?: Partial<TransferEvent>): TransferEvent {
  return {
    eventName: "Transfer",
    contractAddress: NFT_ADDRESS,
    from: ZERO_ADDRESS,
    to: SELLER,
    tokenId: 0n,
    blockNumber: 1n,
    txHash: "0xmint-tx",
    logIndex: 0,
    ...overrides,
  };
}

async function getTestToken(tx: Prisma.TransactionClient) {
  return tx.token.findFirstOrThrow({
    where: { collection: { contractAddress: NFT_ADDRESS } },
    include: { collection: true },
  });
}

function testTransferWhere(): Prisma.TransferWhereInput {
  return { token: { collection: { contractAddress: NFT_ADDRESS } } };
}

describe("applyEvent — Transfer", () => {
  it("mint creates Collection, Token and Transfer row", async () => {
    await inRolledBackTransaction(async (tx) => {
      await applyEvent(tx, new FakeChainReader(), mintEvent());

      const token = await getTestToken(tx);
      expect(token.collection.contractAddress).toBe(NFT_ADDRESS);
      expect(token.collection.name).toBe("Test NFT");
      expect(token.ownerAddress).toBe(SELLER);
      expect(token.tokenUri).toBe("ipfs://test/1");
      expect(token.royaltyBps).toBe(500);

      const transfer = await tx.transfer.findFirstOrThrow({ where: testTransferWhere() });
      expect(transfer.txHash).toBe("0xmint-tx");
      expect(transfer.fromAddress).toBe(ZERO_ADDRESS);
      expect(transfer.toAddress).toBe(SELLER);
    });
  });

  it("is idempotent: re-applying the same mint does not duplicate rows", async () => {
    await inRolledBackTransaction(async (tx) => {
      const chainReader = new FakeChainReader();
      await applyEvent(tx, chainReader, mintEvent());
      await applyEvent(tx, chainReader, mintEvent());

      expect(await tx.token.count({ where: { collection: { contractAddress: NFT_ADDRESS } } })).toBe(1);
      expect(await tx.transfer.count({ where: testTransferWhere() })).toBe(1);
    });
  });

  it("a regular transfer updates Token.ownerAddress and inserts a Transfer row", async () => {
    await inRolledBackTransaction(async (tx) => {
      const chainReader = new FakeChainReader();
      await applyEvent(tx, chainReader, mintEvent());

      const transferEvent: TransferEvent = {
        eventName: "Transfer",
        contractAddress: NFT_ADDRESS,
        from: SELLER,
        to: BUYER,
        tokenId: 0n,
        blockNumber: 2n,
        txHash: "0xtransfer-tx",
        logIndex: 0,
      };
      await applyEvent(tx, chainReader, transferEvent);

      const token = await getTestToken(tx);
      expect(token.ownerAddress).toBe(BUYER);
      expect(await tx.transfer.count({ where: testTransferWhere() })).toBe(2);
    });
  });
});

describe("applyEvent — Listed / Cancelled / Sold", () => {
  async function seedMintedToken(tx: Prisma.TransactionClient, chainReader: ChainReaderPort) {
    await applyEvent(tx, chainReader, mintEvent());
  }

  function listedEvent(overrides?: Partial<ListedEvent>): ListedEvent {
    return {
      eventName: "Listed",
      listingId: LISTING_ID,
      nft: NFT_ADDRESS,
      tokenId: 0n,
      seller: SELLER,
      price: 1_000_000_000_000_000_000n,
      blockNumber: 3n,
      txHash: "0xlist-tx",
      logIndex: 0,
      ...overrides,
    };
  }

  function soldEvent(overrides?: Partial<SoldEvent>): SoldEvent {
    return {
      eventName: "Sold",
      listingId: LISTING_ID,
      buyer: BUYER,
      price: 1_000_000_000_000_000_000n,
      // Mirrors what Marketplace.sol actually emits: 250 bps fee, 500 bps
      // royalty on a 1 ETH sale.
      feeAmount: 25_000_000_000_000_000n,
      royaltyAmount: 50_000_000_000_000_000n,
      royaltyReceiver: ROYALTY_RECEIVER,
      blockNumber: 5n,
      txHash: "0xsold-tx",
      logIndex: 1,
      ...overrides,
    };
  }

  it("Listed creates an ACTIVE listing", async () => {
    await inRolledBackTransaction(async (tx) => {
      const chainReader = new FakeChainReader();
      await seedMintedToken(tx, chainReader);
      await applyEvent(tx, chainReader, listedEvent());

      const listing = await tx.listing.findUniqueOrThrow({ where: { onchainListingId: LISTING_ID } });
      expect(listing.status).toBe("ACTIVE");
      expect(listing.sellerAddress).toBe(SELLER);
      expect(listing.priceWei.toString()).toBe("1000000000000000000");
    });
  });

  it("is idempotent: re-applying the same Listed event does not duplicate the listing", async () => {
    await inRolledBackTransaction(async (tx) => {
      const chainReader = new FakeChainReader();
      await seedMintedToken(tx, chainReader);
      await applyEvent(tx, chainReader, listedEvent());
      await applyEvent(tx, chainReader, listedEvent());

      expect(await tx.listing.count({ where: { onchainListingId: LISTING_ID } })).toBe(1);
    });
  });

  it("Cancelled transitions an ACTIVE listing to CANCELLED, idempotently", async () => {
    await inRolledBackTransaction(async (tx) => {
      const chainReader = new FakeChainReader();
      await seedMintedToken(tx, chainReader);
      await applyEvent(tx, chainReader, listedEvent());

      const cancelledEvent: CancelledEvent = {
        eventName: "Cancelled",
        listingId: LISTING_ID,
        blockNumber: 4n,
        txHash: "0xcancel-tx",
        logIndex: 0,
      };
      await applyEvent(tx, chainReader, cancelledEvent);
      await applyEvent(tx, chainReader, cancelledEvent); // idempotent replay

      const listing = await tx.listing.findUniqueOrThrow({ where: { onchainListingId: LISTING_ID } });
      expect(listing.status).toBe("CANCELLED");
    });
  });

  it("Sold transitions the listing to SOLD and records the fee/royalty split from the event", async () => {
    await inRolledBackTransaction(async (tx) => {
      const chainReader = new FakeChainReader();
      await seedMintedToken(tx, chainReader);
      await applyEvent(tx, chainReader, listedEvent());
      await applyEvent(tx, chainReader, soldEvent());

      const listing = await tx.listing.findUniqueOrThrow({
        where: { onchainListingId: LISTING_ID },
        include: { sale: true },
      });
      expect(listing.status).toBe("SOLD");
      expect(listing.sale?.buyerAddress).toBe(BUYER);
      expect(listing.sale?.feePaidWei.toString()).toBe("25000000000000000");
      expect(listing.sale?.royaltyPaidWei.toString()).toBe("50000000000000000");
    });
  });

  it("is idempotent: re-applying the same Sold event does not duplicate the Sale", async () => {
    await inRolledBackTransaction(async (tx) => {
      const chainReader = new FakeChainReader();
      await seedMintedToken(tx, chainReader);
      await applyEvent(tx, chainReader, listedEvent());
      await applyEvent(tx, chainReader, soldEvent());
      await applyEvent(tx, chainReader, soldEvent());

      expect(await tx.sale.count({ where: { listing: { onchainListingId: LISTING_ID } } })).toBe(1);
    });
  });
});
