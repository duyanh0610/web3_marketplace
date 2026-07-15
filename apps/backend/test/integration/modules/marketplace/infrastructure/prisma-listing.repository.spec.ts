import "dotenv/config";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";
import { PrismaListingRepository } from "@app/modules/marketplace/infrastructure/prisma-listing.repository";
import { createTestPrismaClient } from "../../../support/test-prisma-client";

// Real Postgres (the dedicated test database) — see
// support/test-prisma-client.ts. Distinct contractAddress/onchainListingId
// range from prisma-token.repository.spec.ts so the two integration test
// files never collide even if Jest runs them in parallel workers.
const CONTRACT_ADDRESS = "0xmarketplace-repo-test";
const LISTING_ID_BASE = 5_000_000_000n;

describe("PrismaListingRepository", () => {
  let prisma: PrismaService;
  let repository: PrismaListingRepository;
  let tokenId: string;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    repository = new PrismaListingRepository(prisma);
  });

  beforeEach(async () => {
    const collection = await prisma.collection.create({
      data: { contractAddress: CONTRACT_ADDRESS, name: "Test Collection", symbol: "TST" },
    });
    const token = await prisma.token.create({
      data: {
        collectionId: collection.id,
        tokenId: 0n,
        ownerAddress: "0xowner",
        tokenUri: "ipfs://token0",
        royaltyReceiver: "0xroyalty",
        royaltyBps: 500,
      },
    });
    tokenId = token.id;

    await prisma.listing.create({
      data: {
        onchainListingId: LISTING_ID_BASE,
        tokenId,
        sellerAddress: "0xseller",
        priceWei: "1000000000000000",
        status: "ACTIVE",
        listedAtBlock: 1n,
        lastEventBlock: 1n,
      },
    });
    const soldListing = await prisma.listing.create({
      data: {
        onchainListingId: LISTING_ID_BASE + 1n,
        tokenId,
        sellerAddress: "0xseller",
        priceWei: "2000000000000000",
        status: "SOLD",
        listedAtBlock: 2n,
        lastEventBlock: 3n,
      },
    });
    await prisma.sale.create({
      data: {
        listingId: soldListing.id,
        buyerAddress: "0xbuyer",
        priceWei: "2000000000000000",
        royaltyPaidWei: "100000000000000",
        feePaidWei: "50000000000000",
        txHash: "0xsoldtx",
        blockNumber: 3n,
      },
    });
  });

  afterEach(async () => {
    await prisma.sale.deleteMany({ where: { listing: { tokenId } } });
    await prisma.listing.deleteMany({ where: { tokenId } });
    await prisma.token.deleteMany({ where: { id: tokenId } });
    await prisma.collection.deleteMany({ where: { contractAddress: CONTRACT_ADDRESS } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("findMany filters by status", async () => {
    const active = await repository.findMany({ take: 10, status: "ACTIVE" });
    expect(active.map((l) => l.onchainListingId)).toEqual([LISTING_ID_BASE.toString()]);

    const sold = await repository.findMany({ take: 10, status: "SOLD" });
    expect(sold.map((l) => l.onchainListingId)).toEqual([(LISTING_ID_BASE + 1n).toString()]);
  });

  it("findMany includes the joined sale for a SOLD listing (no separate query needed)", async () => {
    const [sold] = await repository.findMany({ take: 10, status: "SOLD" });

    expect(sold.sale).not.toBeNull();
    expect(sold.sale?.buyerAddress).toBe("0xbuyer");
    expect(sold.sale?.feePaidWei).toBe("50000000000000");
  });

  it("findMany filters by sellerAddress", async () => {
    const bySeller = await repository.findMany({ take: 10, sellerAddress: "0xseller" });
    expect(bySeller).toHaveLength(2);

    const byOtherSeller = await repository.findMany({ take: 10, sellerAddress: "0xnobody" });
    expect(byOtherSeller).toHaveLength(0);
  });

  it("findActiveByTokenId finds the one ACTIVE listing for a token", async () => {
    const active = await repository.findActiveByTokenId(tokenId);
    expect(active?.onchainListingId).toBe(LISTING_ID_BASE.toString());
  });

  it("findByOnchainListingId re-fetches a specific listing by its on-chain id", async () => {
    const listing = await repository.findByOnchainListingId((LISTING_ID_BASE + 1n).toString());
    expect(listing?.status).toBe("SOLD");
    expect(listing?.sale?.buyerAddress).toBe("0xbuyer");
  });

  it("findByOnchainListingId returns null for an id that doesn't exist", async () => {
    const listing = await repository.findByOnchainListingId((LISTING_ID_BASE + 999n).toString());
    expect(listing).toBeNull();
  });
});
