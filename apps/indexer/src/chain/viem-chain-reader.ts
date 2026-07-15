import type { PublicClient } from "viem";
import { MARKETPLACE_NFT_ABI } from "@we3/contracts-abi";
import { ChainReaderPort, CollectionMetadata, TokenMetadata } from "./chain-reader.port";

export class ViemChainReader implements ChainReaderPort {
  constructor(private readonly client: PublicClient) {}

  async getCollectionMetadata(contractAddress: string): Promise<CollectionMetadata> {
    const address = contractAddress as `0x${string}`;
    const [name, symbol] = await Promise.all([
      this.client.readContract({ address, abi: MARKETPLACE_NFT_ABI, functionName: "name" }),
      this.client.readContract({ address, abi: MARKETPLACE_NFT_ABI, functionName: "symbol" }),
    ]);
    return { name: name as string, symbol: symbol as string };
  }

  async getTokenMetadata(contractAddress: string, tokenId: bigint): Promise<TokenMetadata> {
    const address = contractAddress as `0x${string}`;
    const [tokenUri, royaltyInfo] = await Promise.all([
      this.client.readContract({ address, abi: MARKETPLACE_NFT_ABI, functionName: "tokenURI", args: [tokenId] }),
      // salePrice=10000 (an arbitrary round base) — royaltyBps is derived
      // from the returned amount as a fraction of that base, since
      // royaltyInfo() returns an absolute amount, not the bps directly.
      this.client.readContract({
        address,
        abi: MARKETPLACE_NFT_ABI,
        functionName: "royaltyInfo",
        args: [tokenId, 10_000n],
      }),
    ]);
    const [royaltyReceiver, royaltyAmount] = royaltyInfo as [string, bigint];
    return {
      tokenUri: tokenUri as string,
      royaltyReceiver: royaltyReceiver.toLowerCase(),
      royaltyBps: Number(royaltyAmount),
    };
  }
}
