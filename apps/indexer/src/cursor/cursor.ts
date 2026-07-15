import { Prisma, PrismaClient } from "@prisma/client";

export interface Cursor {
  lastIndexedBlock: bigint;
  lastIndexedBlockHash: string;
}

export async function getCursor(prisma: PrismaClient, source: string): Promise<Cursor | null> {
  const row = await prisma.indexerCursor.findUnique({ where: { source } });
  if (!row) {
    return null;
  }
  return { lastIndexedBlock: row.lastIndexedBlock, lastIndexedBlockHash: row.lastIndexedBlockHash };
}

export async function setCursor(tx: Prisma.TransactionClient, source: string, cursor: Cursor): Promise<void> {
  await tx.indexerCursor.upsert({
    where: { source },
    create: {
      source,
      lastIndexedBlock: cursor.lastIndexedBlock,
      lastIndexedBlockHash: cursor.lastIndexedBlockHash,
    },
    update: {
      lastIndexedBlock: cursor.lastIndexedBlock,
      lastIndexedBlockHash: cursor.lastIndexedBlockHash,
    },
  });
}
