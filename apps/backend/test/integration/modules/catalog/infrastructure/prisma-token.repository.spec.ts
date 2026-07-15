import "dotenv/config";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";
import { PrismaTokenRepository } from "@app/modules/catalog/infrastructure/prisma-token.repository";
import { createTestPrismaClient } from "../../../support/test-prisma-client";

// Real Postgres (the dedicated test database), not mocked — see
// support/test-prisma-client.ts for why this isn't the shared dev DB.
const CONTRACT_ADDRESS = "0xcatalog-repo-test";

describe("PrismaTokenRepository", () => {
  let prisma: PrismaService;
  let repository: PrismaTokenRepository;
  let collectionId: string;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    repository = new PrismaTokenRepository(prisma);
  });

  beforeEach(async () => {
    const collection = await prisma.collection.create({
      data: { contractAddress: CONTRACT_ADDRESS, name: "Test Collection", symbol: "TST" },
    });
    collectionId = collection.id;

    // Two tokens, same owner, minted at deliberately distinct timestamps so
    // findOwnedBy's orderBy (mintedAt desc) has a stable, real order to page
    // through rather than relying on default insertion order.
    await prisma.token.create({
      data: {
        collectionId,
        tokenId: 0n,
        ownerAddress: "0xowner",
        tokenUri: "ipfs://token0",
        royaltyReceiver: "0xroyalty",
        royaltyBps: 500,
        mintedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    await prisma.token.create({
      data: {
        collectionId,
        tokenId: 1n,
        ownerAddress: "0xowner",
        tokenUri: "ipfs://token1",
        royaltyReceiver: "0xroyalty",
        royaltyBps: 500,
        mintedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    });
  });

  afterEach(async () => {
    await prisma.token.deleteMany({ where: { collectionId } });
    await prisma.collection.deleteMany({ where: { contractAddress: CONTRACT_ADDRESS } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("findByCollectionAndTokenId returns the token with its nested collection", async () => {
    const token = await repository.findByCollectionAndTokenId(CONTRACT_ADDRESS, "1");

    expect(token).not.toBeNull();
    expect(token?.tokenId).toBe("1");
    expect(token?.ownerAddress).toBe("0xowner");
    expect(token?.collection).toEqual({
      id: collectionId,
      contractAddress: CONTRACT_ADDRESS,
      name: "Test Collection",
      symbol: "TST",
    });
  });

  it("findByCollectionAndTokenId returns null for a token that doesn't exist", async () => {
    const token = await repository.findByCollectionAndTokenId(CONTRACT_ADDRESS, "999");
    expect(token).toBeNull();
  });

  it("findOwnedBy pages through results newest-mint-first via the real cursor", async () => {
    const firstPage = await repository.findOwnedBy("0xowner", { take: 1 });
    expect(firstPage).toHaveLength(1);
    expect(firstPage[0].tokenId).toBe("1"); // most recently minted

    const secondPage = await repository.findOwnedBy("0xowner", { take: 1, cursorId: firstPage[0].id });
    expect(secondPage).toHaveLength(1);
    expect(secondPage[0].tokenId).toBe("0");
  });

  it("findByIds batches a lookup across multiple tokens", async () => {
    const [token0, token1] = await repository.findOwnedBy("0xowner", { take: 2 });

    const found = await repository.findByIds([token0.id, token1.id]);

    expect(found).toHaveLength(2);
    expect(found.map((t) => t.tokenId).sort()).toEqual(["0", "1"]);
  });
});
