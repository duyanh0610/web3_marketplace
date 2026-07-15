import { ethers, upgrades } from "hardhat";

async function main() {
  const contractName = process.env.CONTRACT_NAME;
  const proxyAddress = process.env.PROXY_ADDRESS ?? process.env.NFT_PROXY_ADDRESS;
  if (!contractName) {
    throw new Error("CONTRACT_NAME env var is required (e.g. Marketplace, MarketplaceNFT)");
  }
  if (!proxyAddress) {
    throw new Error("PROXY_ADDRESS (or NFT_PROXY_ADDRESS) env var is required");
  }

  const Factory = await ethers.getContractFactory(contractName);

  // Deploys the new implementation and validates storage-layout compatibility
  // against .openzeppelin/<network>.json. Does NOT touch the proxy — upgrading
  // requires the proxy owner (the Gnosis Safe) to call upgradeToAndCall itself.
  const newImplementationAddress = await upgrades.prepareUpgrade(proxyAddress, Factory, {
    kind: "uups",
  });

  const calldata = Factory.interface.encodeFunctionData("upgradeToAndCall", [newImplementationAddress, "0x"]);

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
