import type { Log } from "viem";
import { decodeMarketplaceLog, decodeMarketplaceNftLog } from "./decode-log";

// Real logs captured from actual transactions on a local Hardhat network
// running the real compiled MarketplaceNFT/Marketplace contracts (deploy →
// mint → list → buy → mint → list → cancel) — not hand-crafted hex, so the
// ABI encoding is guaranteed correct. See git history for the one-off dump
// script used to generate these (apps/contracts/scripts/dump-real-logs.ts,
// since removed).

function fakeLog(overrides: Partial<Log>): Log {
  return {
    address: "0x0000000000000000000000000000000000000000",
    blockHash: "0x0",
    blockNumber: 0n,
    data: "0x",
    logIndex: 0,
    removed: false,
    topics: [],
    transactionHash: "0x0",
    transactionIndex: 0,
    ...overrides,
  } as Log;
}

const MINT_TRANSFER_LOG = fakeLog({
  address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  topics: [
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ] as unknown as Log["topics"],
  data: "0x",
  blockNumber: 5n,
  transactionHash: "0xd88193420c6bb9c5fbc5798a5446e52cbe0c2a6f53c88ace7d8c096ca05a4f10",
  logIndex: 0,
});

const LISTED_LOG = fakeLog({
  address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  topics: [
    "0x9791797c382de5e73cc7c32c32ffd8304e9b9cc1f6afd967990c1edd0729dba9",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ] as unknown as Log["topics"],
  data: "0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000de0b6b3a7640000",
  blockNumber: 7n,
  transactionHash: "0x2c7abb80a27e159aa39e6745773641ac4a28146b1388e8693e92c28d51de4534",
  logIndex: 0,
});

// Sold now emits feeAmount/royaltyAmount/royaltyReceiver alongside price
// (Marketplace.sol change to remove the indexer's need to recompute the
// split from potentially-stale current feeBps — see apply-sold.ts).
const SOLD_LOG = fakeLog({
  address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  topics: [
    "0x8e7849030378e6cbc7726a8ad9db8232503e8d1301387028268b1d15ca33a93e",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  ] as unknown as Log["topics"],
  data: "0x0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000058d15e1762800000000000000000000000000000000000000000000000000000b1a2bc2ec5000000000000000000000000000090f79bf6eb2c4f870365e785982e1f101e93b906",
  blockNumber: 8n,
  transactionHash: "0x2f30586a333a8dcda7faf8f7d90570b4f3a4602a951eb78ea250f3daebcf9603",
  logIndex: 1,
});

const CANCELLED_LOG = fakeLog({
  address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  topics: [
    "0xc41d93b8bfbf9fd7cf5bfe271fd649ab6a6fec0ea101c23b82a2a28eca2533a9",
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  ] as unknown as Log["topics"],
  data: "0x",
  blockNumber: 12n,
  transactionHash: "0xa2eb5424cfd39460923fed10c43eed3e511484d34f7eba94fb3626b7fcdd30bf",
  logIndex: 0,
});

describe("decodeMarketplaceNftLog", () => {
  it("decodes a Transfer log representing a mint (from = zero address)", () => {
    const decoded = decodeMarketplaceNftLog(MINT_TRANSFER_LOG);

    expect(decoded).toEqual({
      eventName: "Transfer",
      contractAddress: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
      from: "0x0000000000000000000000000000000000000000",
      to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      tokenId: 0n,
      blockNumber: 5n,
      txHash: "0xd88193420c6bb9c5fbc5798a5446e52cbe0c2a6f53c88ace7d8c096ca05a4f10",
      logIndex: 0,
    });
  });

  it("returns null for a log from a different ABI (e.g. Listed)", () => {
    expect(decodeMarketplaceNftLog(LISTED_LOG)).toBeNull();
  });
});

describe("decodeMarketplaceLog", () => {
  it("decodes a Listed log", () => {
    const decoded = decodeMarketplaceLog(LISTED_LOG);

    expect(decoded).toEqual({
      eventName: "Listed",
      listingId: 0n,
      nft: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
      tokenId: 0n,
      seller: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      price: 1_000_000_000_000_000_000n,
      blockNumber: 7n,
      txHash: "0x2c7abb80a27e159aa39e6745773641ac4a28146b1388e8693e92c28d51de4534",
      logIndex: 0,
    });
  });

  it("decodes a Sold log", () => {
    const decoded = decodeMarketplaceLog(SOLD_LOG);

    expect(decoded).toEqual({
      eventName: "Sold",
      listingId: 0n,
      buyer: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      price: 1_000_000_000_000_000_000n,
      feeAmount: 25_000_000_000_000_000n,
      royaltyAmount: 50_000_000_000_000_000n,
      royaltyReceiver: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
      blockNumber: 8n,
      txHash: "0x2f30586a333a8dcda7faf8f7d90570b4f3a4602a951eb78ea250f3daebcf9603",
      logIndex: 1,
    });
  });

  it("decodes a Cancelled log", () => {
    const decoded = decodeMarketplaceLog(CANCELLED_LOG);

    expect(decoded).toEqual({
      eventName: "Cancelled",
      listingId: 1n,
      blockNumber: 12n,
      txHash: "0xa2eb5424cfd39460923fed10c43eed3e511484d34f7eba94fb3626b7fcdd30bf",
      logIndex: 0,
    });
  });

  it("returns null for a log from a different ABI (e.g. Transfer)", () => {
    expect(decodeMarketplaceLog(MINT_TRANSFER_LOG)).toBeNull();
  });
});
