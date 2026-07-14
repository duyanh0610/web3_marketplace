import { ethers, network, upgrades } from "hardhat";

const DEFAULT_FEE_BPS = 250n; // 2.5%

async function main() {
  const feeBps = process.env.MARKETPLACE_FEE_BPS ? BigInt(process.env.MARKETPLACE_FEE_BPS) : DEFAULT_FEE_BPS;
  const safeAddress = process.env.SAFE_ADDRESS;
  const feeRecipient = process.env.MARKETPLACE_FEE_RECIPIENT ?? safeAddress;

  if (!feeRecipient) {
    throw new Error("No fee recipient available — set MARKETPLACE_FEE_RECIPIENT or SAFE_ADDRESS env var");
  }

  const Marketplace = await ethers.getContractFactory("Marketplace");

  const proxy = await upgrades.deployProxy(Marketplace, [feeRecipient, feeBps], {
    kind: "uups",
  });
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`network:        ${network.name}`);
  console.log(`proxy:          ${proxyAddress}`);
  console.log(`implementation: ${implementationAddress}`);
  console.log(`feeRecipient:   ${feeRecipient}`);
  console.log(`feeBps:         ${feeBps}`);

  // Ownership starts with the deployer EOA and must move to the Gnosis Safe
  // before real use (docs/09-security-model.md §3) — same pattern as
  // scripts/deploy.ts (MarketplaceNFT).
  if (safeAddress) {
    const tx = await proxy.transferOwnership(safeAddress);
    await tx.wait();
    console.log(`ownership transferred to Safe: ${safeAddress}`);
  } else {
    console.log(
      "SAFE_ADDRESS not set — proxy owner is still the deployer EOA. " +
        "Transfer ownership to the Gnosis Safe before real use.",
    );
  }

  console.log(`\nVerify with: npx hardhat verify --network ${network.name} ${proxyAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
