import { ListingRecord, SaleRecord } from "@app/modules/marketplace/application/ports/listing-repository.port";
import { toListingType } from "@app/modules/marketplace/presentation/mappers/listing.mapper";

function fakeSale(overrides?: Partial<SaleRecord>): SaleRecord {
  return {
    id: "sale-id",
    buyerAddress: "0xbuyer",
    priceWei: "1000000000000000",
    royaltyPaidWei: "50000000000000",
    feePaidWei: "25000000000000",
    txHash: "0xtxhash",
    settledAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function fakeListing(overrides?: Partial<ListingRecord>): ListingRecord {
  return {
    id: "listing-id",
    onchainListingId: "0",
    tokenId: "token-id",
    sellerAddress: "0xseller",
    priceWei: "1000000000000000",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    sale: null,
    ...overrides,
  };
}

describe("toListingType", () => {
  it("maps sellerAddress to seller and carries tokenId through (used by ListingResolver's field resolver, not a GraphQL field itself)", () => {
    const mapped = toListingType(fakeListing());

    expect(mapped.seller).toBe("0xseller");
    expect(mapped.tokenId).toBe("token-id");
    expect(mapped.status).toBe("ACTIVE");
    expect(mapped.sale).toBeUndefined();
    expect(mapped.token).toBeUndefined();
  });

  it("maps a present sale (already joined by the repository, not deferred to a field resolver)", () => {
    const mapped = toListingType(fakeListing({ status: "SOLD", sale: fakeSale() }));

    expect(mapped.sale).toEqual({
      id: "sale-id",
      buyer: "0xbuyer",
      priceWei: "1000000000000000",
      royaltyPaidWei: "50000000000000",
      feePaidWei: "25000000000000",
      txHash: "0xtxhash",
      settledAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });
});
