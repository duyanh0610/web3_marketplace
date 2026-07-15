import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";

export function createChainClient(rpcUrl: string): PublicClient {
  return createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
}
