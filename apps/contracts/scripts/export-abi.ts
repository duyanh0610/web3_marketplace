import * as fs from "fs";
import * as path from "path";
import { artifacts, network } from "hardhat";

const OUTPUT_DIR = path.join(__dirname, "../../../packages/contracts-abi/src");

function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

async function main() {
  const contractName = process.env.CONTRACT_NAME ?? "MarketplaceNFT";
  const proxyAddress = process.env.PROXY_ADDRESS ?? process.env.NFT_PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("PROXY_ADDRESS (or NFT_PROXY_ADDRESS) env var is required");
  }

  const fileBase = toKebabCase(contractName);
  const abiPath = path.join(OUTPUT_DIR, `${fileBase}.abi.json`);
  const addressesPath = path.join(OUTPUT_DIR, `${fileBase}.addresses.json`);

  const artifact = await artifacts.readArtifact(contractName);
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2) + "\n");

  const existingAddresses: Record<string, string> = fs.existsSync(addressesPath)
    ? JSON.parse(fs.readFileSync(addressesPath, "utf-8"))
    : {};
  const addresses = { ...existingAddresses, [network.name]: proxyAddress };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2) + "\n");

  console.log(`wrote ABI to ${abiPath}`);
  console.log(`wrote addresses to ${addressesPath}:`, addresses);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
