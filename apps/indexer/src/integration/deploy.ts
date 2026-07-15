import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { MARKETPLACE_ABI, MARKETPLACE_NFT_ABI } from "@we3/contracts-abi";

const CONTRACTS_DIR = path.resolve(__dirname, "../../../contracts");

// Hardhat's standard deterministic default accounts (mnemonic "test test
// test test test test test test test test test junk") — apps/contracts's
// hardhat.config.ts doesn't override accounts for the local `hardhat`
// network, so these are the real keys a local `hardhat node` accepts.
// Verified directly against a real `hardhat node`'s own startup log rather
// than typed from memory (an earlier attempt had a transcription error —
// one dropped hex digit — that made viem reject the key outright).
export const DEPLOYER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const; // account #0
export const BUYER_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const; // account #1

interface Artifact {
  abi: unknown[];
  bytecode: `0x${string}`;
}

// Read raw Hardhat build artifacts (not @we3/contracts-abi, which has no
// bytecode) directly off disk rather than a static `import`, since they
// live outside apps/indexer's tsconfig `rootDir` and are a generated build
// output, not source.
function readArtifact(relativeArtifactPath: string): Artifact {
  const fullPath = path.join(CONTRACTS_DIR, "artifacts", relativeArtifactPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as Artifact;
}

export function createTestClients(rpcUrl: string) {
  const publicClient = createPublicClient({ chain: hardhat, transport: http(rpcUrl) });
  const deployer = createWalletClient({
    account: privateKeyToAccount(DEPLOYER_PRIVATE_KEY),
    chain: hardhat,
    transport: http(rpcUrl),
  });
  const buyer = createWalletClient({
    account: privateKeyToAccount(BUYER_PRIVATE_KEY),
    chain: hardhat,
    transport: http(rpcUrl),
  });
  return { publicClient, deployer, buyer };
}

export interface DeployedContracts {
  nftAddress: Address;
  marketplaceAddress: Address;
  deployBlock: bigint;
}

/** Deploys a real implementation contract behind a real ERC1967Proxy and
 * initializes it through the proxy (exactly what
 * `upgrades.deployProxy(...)` does in apps/contracts's own deploy scripts,
 * and exactly what's live on Sepolia) — NOT by calling initialize() on the
 * bare implementation directly, which always reverts with
 * InvalidInitialization(): the implementation's own constructor calls
 * `_disableInitializers()`, permanently locking initialization at that
 * exact contract address's storage. Routing the initializer call through
 * the proxy's constructor instead works because the proxy has its own,
 * separate storage. */
async function deployBehindProxy(
  publicClient: PublicClient,
  deployer: WalletClient,
  implementationArtifact: Artifact,
  initCalldata: `0x${string}`,
): Promise<{ address: Address; deployBlock: bigint }> {
  const deployerAccount = deployer.account!;
  const proxyArtifact = readArtifact("@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json");

  const implHash = await deployer.deployContract({
    abi: implementationArtifact.abi,
    bytecode: implementationArtifact.bytecode,
    args: [],
    account: deployerAccount,
    chain: hardhat,
  });
  const implReceipt = await publicClient.waitForTransactionReceipt({ hash: implHash });
  const implementationAddress = implReceipt.contractAddress as Address;

  const proxyHash = await deployer.deployContract({
    abi: proxyArtifact.abi,
    bytecode: proxyArtifact.bytecode,
    args: [implementationAddress, initCalldata],
    account: deployerAccount,
    chain: hardhat,
  });
  const proxyReceipt = await publicClient.waitForTransactionReceipt({ hash: proxyHash });

  return { address: proxyReceipt.contractAddress as Address, deployBlock: implReceipt.blockNumber };
}

export async function deployContracts(
  publicClient: PublicClient,
  deployer: WalletClient,
  feeRecipient: Address,
): Promise<DeployedContracts> {
  const nftArtifact = readArtifact("contracts/MarketplaceNFT.sol/MarketplaceNFT.json");
  const marketplaceArtifact = readArtifact("contracts/Marketplace.sol/Marketplace.json");

  const nft = await deployBehindProxy(
    publicClient,
    deployer,
    nftArtifact,
    encodeFunctionData({
      abi: MARKETPLACE_NFT_ABI,
      functionName: "initialize",
      args: ["Integration Test NFT", "ITNFT"],
    }),
  );

  const marketplace = await deployBehindProxy(
    publicClient,
    deployer,
    marketplaceArtifact,
    encodeFunctionData({
      abi: MARKETPLACE_ABI,
      functionName: "initialize",
      args: [feeRecipient, 250n],
    }),
  );

  return {
    nftAddress: nft.address,
    marketplaceAddress: marketplace.address,
    deployBlock: nft.deployBlock < marketplace.deployBlock ? nft.deployBlock : marketplace.deployBlock,
  };
}
