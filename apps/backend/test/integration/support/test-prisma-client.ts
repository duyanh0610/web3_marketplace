import { PrismaService } from "@app/shared/infrastructure/prisma.service";

// A dedicated test database (we3_marketplace_test), never the shared dev
// database real Sepolia verification data lives in — see
// apps/indexer/src/integration's own tests for why this matters: an
// earlier integration test that reused the shared dev DB collided with
// real accumulated data (same onchainListingId) and silently corrupted it.
const TEST_DATABASE_URL =
  process.env.INTEGRATION_TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/we3_marketplace_test?schema=public";

// PrismaService (not a bare PrismaClient) since the repositories under test
// are typed against it — same class, just with the two lifecycle hooks.
export function createTestPrismaClient(): PrismaService {
  return new PrismaService({ datasources: { db: { url: TEST_DATABASE_URL } } });
}
