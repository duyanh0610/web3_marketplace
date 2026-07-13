import { ethers, network, upgrades } from "hardhat";

const COLLECTION_NAME = process.env.NFT_COLLECTION_NAME ?? "Marketplace NFT";
const COLLECTION_SYMBOL = process.env.NFT_COLLECTION_SYMBOL ?? "MNFT";

async function main() {
  const MarketplaceNFT = await ethers.getContractFactory("MarketplaceNFT");

  const proxy = await upgrades.deployProxy(MarketplaceNFT, [COLLECTION_NAME, COLLECTION_SYMBOL], {
    kind: "uups",
  });
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`network:        ${network.name}`);
  console.log(`proxy:          ${proxyAddress}`);
  console.log(`implementation: ${implementationAddress}`);

  // Ownership starts with the deployer EOA and must move to the Gnosis Safe
  // before any real minting happens (docs/09-security-model.md §3). Left as
  // an explicit opt-in via SAFE_ADDRESS since the Safe (milestone task 6)
  // may not exist yet at deploy time.
  const safeAddress = process.env.SAFE_ADDRESS;
  if (safeAddress) {
    const tx = await proxy.transferOwnership(safeAddress);
    await tx.wait();
    console.log(`ownership transferred to Safe: ${safeAddress}`);
  } else {
    console.log(
      "SAFE_ADDRESS not set — proxy owner is still the deployer EOA. " +
        "Transfer ownership to the Gnosis Safe before minting in production.",
    );
  }

  console.log(
    `\nVerify with: npx hardhat verify --network ${network.name} ${proxyAddress}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
