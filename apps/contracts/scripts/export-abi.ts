import * as fs from "fs";
import * as path from "path";
import { artifacts, network } from "hardhat";

const OUTPUT_DIR = path.join(__dirname, "../../../packages/contracts-abi/src");
const ABI_PATH = path.join(OUTPUT_DIR, "marketplace-nft.abi.json");
const ADDRESSES_PATH = path.join(OUTPUT_DIR, "marketplace-nft.addresses.json");

async function main() {
  const proxyAddress = process.env.NFT_PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("NFT_PROXY_ADDRESS env var is required");
  }

  const artifact = await artifacts.readArtifact("MarketplaceNFT");
  fs.writeFileSync(ABI_PATH, JSON.stringify(artifact.abi, null, 2) + "\n");

  const existingAddresses: Record<string, string> = fs.existsSync(ADDRESSES_PATH)
    ? JSON.parse(fs.readFileSync(ADDRESSES_PATH, "utf-8"))
    : {};
  const addresses = { ...existingAddresses, [network.name]: proxyAddress };
  fs.writeFileSync(ADDRESSES_PATH, JSON.stringify(addresses, null, 2) + "\n");

  console.log(`wrote ABI to ${ABI_PATH}`);
  console.log(`wrote addresses to ${ADDRESSES_PATH}:`, addresses);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
