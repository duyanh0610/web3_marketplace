-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siwe_sessions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siwe_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_address_key" ON "accounts"("address");

-- CreateIndex
CREATE UNIQUE INDEX "siwe_sessions_nonce_key" ON "siwe_sessions"("nonce");

-- CreateIndex
CREATE INDEX "siwe_sessions_nonce_idx" ON "siwe_sessions"("nonce");

-- AddForeignKey
ALTER TABLE "siwe_sessions" ADD CONSTRAINT "siwe_sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
