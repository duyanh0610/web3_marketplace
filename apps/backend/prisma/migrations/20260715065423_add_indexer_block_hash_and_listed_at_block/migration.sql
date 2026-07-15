/*
  Warnings:

  - Added the required column `listedAtBlock` to the `listings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "listedAtBlock" BIGINT NOT NULL;

-- CreateTable
CREATE TABLE "indexer_block_hashes" (
    "source" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,

    CONSTRAINT "indexer_block_hashes_pkey" PRIMARY KEY ("source","blockNumber")
);
