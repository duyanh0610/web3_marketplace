import "dotenv/config";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";

// Points PrismaService at the dedicated test database rather than the
// shared dev DB real Sepolia verification data lives in (see
// test/integration/support/test-prisma-client.ts for the incident that
// established this rule). Must be set *before* AppModule is imported/
// compiled, since @nestjs/config's ConfigModule.forRoot loads .env via
// dotenv during that compile step, and dotenv only fills in env vars that
// aren't already set — so this line has to win the race, not dotenv's.
process.env.DATABASE_URL =
  process.env.INTEGRATION_TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/we3_marketplace_test?schema=public";

const CONTRACT_ADDRESS = "0xe2e-graphql-test";

describe("GraphQL e2e (real Nest app, real Postgres test DB, real HTTP via supertest)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let tokenId: string;

  beforeAll(async () => {
    // Imported dynamically, after DATABASE_URL is set above — AppModule's
    // eager providers (including PrismaService) construct against whatever
    // DATABASE_URL is in process.env at compile time.
    const { AppModule } = await import("@app/app.module");

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    const collection = await prisma.collection.create({
      data: { contractAddress: CONTRACT_ADDRESS, name: "E2E Collection", symbol: "E2E" },
    });
    const token = await prisma.token.create({
      data: {
        collectionId: collection.id,
        tokenId: 0n,
        ownerAddress: "0xowner",
        tokenUri: "ipfs://e2e-token",
        royaltyReceiver: "0xroyalty",
        royaltyBps: 250,
      },
    });
    tokenId = token.id;
    await prisma.listing.create({
      data: {
        onchainListingId: 6_000_000_000n,
        tokenId,
        sellerAddress: "0xowner",
        priceWei: "3000000000000000",
        status: "ACTIVE",
        listedAtBlock: 1n,
        lastEventBlock: 1n,
      },
    });
  });

  afterEach(async () => {
    await prisma.listing.deleteMany({ where: { tokenId } });
    await prisma.token.deleteMany({ where: { id: tokenId } });
    await prisma.collection.deleteMany({ where: { contractAddress: CONTRACT_ADDRESS } });
  });

  afterAll(async () => {
    await app.close();
  });

  function graphql(query: string) {
    return request(app.getHttpServer()).post("/graphql").send({ query });
  }

  it("listings query returns the seeded ACTIVE listing with its nested token/collection", async () => {
    const response = await graphql(
      `query { listings(status: ACTIVE, sellerAddress: "0xowner") {
         edges { node { onchainListingId priceWei status token { tokenId owner collection { contractAddress name } } } }
         pageInfo { hasNextPage }
       } }`,
    );

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.listings.edges).toHaveLength(1);
    expect(response.body.data.listings.edges[0].node).toEqual({
      onchainListingId: "6000000000",
      priceWei: "3000000000000000",
      status: "ACTIVE",
      token: {
        tokenId: "0",
        owner: "0xowner",
        collection: { contractAddress: CONTRACT_ADDRESS, name: "E2E Collection" },
      },
    });
  });

  it("token query resolves activeListing (cross-module field resolver) and an empty transfers connection", async () => {
    const response = await graphql(
      `query { token(collectionAddress: "${CONTRACT_ADDRESS}", tokenId: "0") {
         owner
         activeListing { onchainListingId status }
         transfers { edges { node { id } } pageInfo { hasNextPage } }
       } }`,
    );

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.token.owner).toBe("0xowner");
    expect(response.body.data.token.activeListing).toEqual({ onchainListingId: "6000000000", status: "ACTIVE" });
    expect(response.body.data.token.transfers.edges).toEqual([]);
  });

  it("token query returns null for a token that doesn't exist", async () => {
    const response = await graphql(`query { token(collectionAddress: "${CONTRACT_ADDRESS}", tokenId: "999") { id } }`);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.token).toBeNull();
  });

  describe("requestMetadataUpload mutation", () => {
    const mutation =
      'mutation { requestMetadataUpload(fileName: "a.png", contentType: "image/png") { uploadUrl expiresAt } }';

    it("rejects an unauthenticated caller", async () => {
      const response = await graphql(mutation);

      expect(response.body.data).toBeNull();
      expect(response.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
    });

    it("succeeds for an authenticated caller and returns the fixed REST upload target", async () => {
      const token = await jwt.signAsync({ sub: "test-account-id", address: "0xowner" });

      const response = await request(app.getHttpServer())
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send({ query: mutation });

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.requestMetadataUpload.uploadUrl).toBe("/api/v1/metadata/upload");
      expect(new Date(response.body.data.requestMetadataUpload.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
