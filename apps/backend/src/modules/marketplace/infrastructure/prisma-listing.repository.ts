import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";
import {
  FindListingsArgs,
  ListingRecord,
  ListingRepository,
  SaleRecord,
} from "@app/modules/marketplace/application/ports/listing-repository.port";

const includeSale = { sale: true } satisfies Prisma.ListingInclude;
type ListingWithSale = Prisma.ListingGetPayload<{ include: typeof includeSale }>;

function toSaleRecord(sale: NonNullable<ListingWithSale["sale"]>): SaleRecord {
  return {
    id: sale.id,
    buyerAddress: sale.buyerAddress,
    priceWei: sale.priceWei.toString(),
    royaltyPaidWei: sale.royaltyPaidWei.toString(),
    feePaidWei: sale.feePaidWei.toString(),
    txHash: sale.txHash,
    settledAt: sale.settledAt,
  };
}

function toListingRecord(listing: ListingWithSale): ListingRecord {
  return {
    id: listing.id,
    onchainListingId: listing.onchainListingId.toString(),
    tokenId: listing.tokenId,
    sellerAddress: listing.sellerAddress,
    priceWei: listing.priceWei.toString(),
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    sale: listing.sale ? toSaleRecord(listing.sale) : null,
  };
}

@Injectable()
export class PrismaListingRepository implements ListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(args: FindListingsArgs): Promise<ListingRecord[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        ...(args.status && { status: args.status }),
        ...(args.sellerAddress && { sellerAddress: args.sellerAddress }),
      },
      include: includeSale,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: args.take,
      ...(args.cursorId && { cursor: { id: args.cursorId }, skip: 1 }),
    });
    return listings.map(toListingRecord);
  }

  async findActiveByTokenId(tokenId: string): Promise<ListingRecord | null> {
    const listing = await this.prisma.listing.findFirst({
      where: { tokenId, status: "ACTIVE" },
      include: includeSale,
    });
    return listing ? toListingRecord(listing) : null;
  }

  async findByOnchainListingId(onchainListingId: string): Promise<ListingRecord | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { onchainListingId: BigInt(onchainListingId) },
      include: includeSale,
    });
    return listing ? toListingRecord(listing) : null;
  }
}
