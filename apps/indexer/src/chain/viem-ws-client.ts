import { createPublicClient, webSocket, type PublicClient } from "viem";
import { sepolia } from "viem/chains";

export function createWsChainClient(wsRpcUrl: string): PublicClient {
  // viem reconnects this with backoff on its own if the socket drops (see
  // docs/08-blockchain-indexer.md §8) — live.ts doesn't need to coordinate
  // that itself since polling (see live.ts) is always running as the
  // correctness baseline regardless of the websocket's state.
  return createPublicClient({ chain: sepolia, transport: webSocket(wsRpcUrl) });
}
