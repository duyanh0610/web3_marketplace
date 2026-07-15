import { TokenRecord } from "@app/modules/catalog/application/ports/token-repository.port";
import { toTokenType } from "@app/modules/catalog/presentation/mappers/token.mapper";

function fakeRecord(overrides?: Partial<TokenRecord>): TokenRecord {
  return {
    id: "token-id",
    collection: { id: "collection-id", contractAddress: "0xnft", name: "Test", symbol: "TST" },
    tokenId: "0",
    ownerAddress: "0xowner",
    tokenUri: "ipfs://token",
    metadataCid: "bafy-metadata",
    royaltyReceiver: "0xroyalty",
    royaltyBps: 500,
    ...overrides,
  };
}

describe("toTokenType", () => {
  it("maps ownerAddress to owner and carries every field through unchanged", () => {
    const mapped = toTokenType(fakeRecord());

    expect(mapped).toEqual({
      id: "token-id",
      collection: { id: "collection-id", contractAddress: "0xnft", name: "Test", symbol: "TST" },
      tokenId: "0",
      owner: "0xowner",
      tokenUri: "ipfs://token",
      metadataCid: "bafy-metadata",
      royaltyReceiver: "0xroyalty",
      royaltyBps: 500,
    });
  });

  it("maps a null metadataCid (not yet pinned) to undefined rather than null", () => {
    const mapped = toTokenType(fakeRecord({ metadataCid: null }));

    expect(mapped.metadataCid).toBeUndefined();
  });
});
