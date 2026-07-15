-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'SOLD');

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "implementationVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "tokenUri" TEXT NOT NULL,
    "metadataCid" TEXT,
    "royaltyReceiver" TEXT,
    "royaltyBps" INTEGER,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "onchainListingId" BIGINT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "priceWei" DECIMAL(65,30) NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastEventBlock" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerAddress" TEXT NOT NULL,
    "priceWei" DECIMAL(65,30) NOT NULL,
    "royaltyPaidWei" DECIMAL(65,30) NOT NULL,
    "feePaidWei" DECIMAL(65,30) NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_cursors" (
    "source" TEXT NOT NULL,
    "lastIndexedBlock" BIGINT NOT NULL,
    "lastIndexedBlockHash" TEXT NOT NULL,

    CONSTRAINT "indexer_cursors_pkey" PRIMARY KEY ("source")
);

-- CreateIndex
CREATE UNIQUE INDEX "collections_contractAddress_key" ON "collections"("contractAddress");

-- CreateIndex
CREATE INDEX "tokens_ownerAddress_idx" ON "tokens"("ownerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_collectionId_tokenId_key" ON "tokens"("collectionId", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "listings_onchainListingId_key" ON "listings"("onchainListingId");

-- CreateIndex
CREATE INDEX "listings_status_createdAt_idx" ON "listings"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "listings_sellerAddress_status_idx" ON "listings"("sellerAddress", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_listingId_key" ON "sales"("listingId");

-- CreateIndex
CREATE INDEX "transfers_tokenId_occurredAt_idx" ON "transfers"("tokenId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_txHash_logIndex_key" ON "transfers"("txHash", "logIndex");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
