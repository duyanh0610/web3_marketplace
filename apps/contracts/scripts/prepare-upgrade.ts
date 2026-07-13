import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.NFT_PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("NFT_PROXY_ADDRESS env var is required");
  }

  const MarketplaceNFTV2 = await ethers.getContractFactory("MarketplaceNFTV2");

  // Deploys the new implementation and validates storage-layout compatibility
  // against .openzeppelin/<network>.json. Does NOT touch the proxy — upgrading
  // requires the proxy owner (the Gnosis Safe) to call upgradeToAndCall itself.
  const newImplementationAddress = await upgrades.prepareUpgrade(proxyAddress, MarketplaceNFTV2, {
    kind: "uups",
  });

  const calldata = MarketplaceNFTV2.interface.encodeFunctionData("upgradeToAndCall", [
    newImplementationAddress,
    "0x",
  ]);

  console.log(`new implementation: ${newImplementationAddress}`);
  console.log(`\nExecute this from the Safe (Transaction Builder app):`);
  console.log(`  to:    ${proxyAddress}`);
  console.log(`  value: 0`);
  console.log(`  data:  ${calldata}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
