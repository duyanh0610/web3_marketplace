import { ListingRecord, SaleRecord } from "@app/modules/marketplace/application/ports/listing-repository.port";
import { ListingType } from "@app/modules/marketplace/presentation/types/listing.type";
import { SaleType } from "@app/modules/marketplace/presentation/types/sale.type";
import { ListingStatusEnum } from "@app/modules/marketplace/presentation/types/listing-status.enum";

function toSaleType(sale: SaleRecord): SaleType {
  return {
    id: sale.id,
    buyer: sale.buyerAddress,
    priceWei: sale.priceWei,
    royaltyPaidWei: sale.royaltyPaidWei,
    feePaidWei: sale.feePaidWei,
    txHash: sale.txHash,
    settledAt: sale.settledAt,
  };
}

// `sale` is mapped directly (the repository already fetches it in the same
// query — see PrismaListingRepository's `include: { sale: true }` — so
// there's no N+1 concern to defer to a field resolver). `token` is left
// undefined for ListingResolver's @ResolveField (batched via TokenLoader).
export function toListingType(record: ListingRecord): ListingType {
  return {
    id: record.id,
    onchainListingId: record.onchainListingId,
    tokenId: record.tokenId,
    seller: record.sellerAddress,
    priceWei: record.priceWei,
    status: record.status as ListingStatusEnum,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sale: record.sale ? toSaleType(record.sale) : undefined,
  };
}
