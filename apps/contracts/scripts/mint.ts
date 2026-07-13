import { ethers } from "hardhat";
import type { Log, LogDescription } from "ethers";

// Placeholder metadata URI — real IPFS pinning lands in milestone 3
// (docs/milestones/milestone-03-metadata-ipfs.md). This script only proves
// the on-chain mint/tokenURI/royaltyInfo mechanics work end-to-end.
const MINT_URI =
  process.env.MINT_URI ?? "ipfs://bafybeigsample000000000000000000000000000000000000000/1";
const ROYALTY_BPS = Number(process.env.ROYALTY_BPS ?? 500);

async function main() {
  const proxyAddress = process.env.NFT_PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("NFT_PROXY_ADDRESS env var is required");
  }

  const [signer] = await ethers.getSigners();
  const nft = await ethers.getContractAt("MarketplaceNFT", proxyAddress, signer);

  const mintTo = process.env.MINT_TO ?? signer.address;
  const royaltyReceiver = process.env.ROYALTY_RECEIVER ?? signer.address;

  const tx = await nft.mint(mintTo, MINT_URI, royaltyReceiver, ROYALTY_BPS);
  const receipt = await tx.wait();

  const transferEvent = receipt!.logs
    .map((log: Log) => {
      try {
        return nft.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed: LogDescription | null) => parsed?.name === "Transfer");
  const tokenId = transferEvent!.args.tokenId as bigint;

  const [onChainUri, [onChainReceiver, onChainRoyaltyAmount], owner] = await Promise.all([
    nft.tokenURI(tokenId),
    nft.royaltyInfo(tokenId, 10_000n),
    nft.ownerOf(tokenId),
  ]);

  console.log(`tx:              ${tx.hash}`);
  console.log(`tokenId:         ${tokenId}`);
  console.log(`owner:           ${owner}`);
  console.log(`tokenURI:        ${onChainUri}`);
  console.log(`royaltyReceiver: ${onChainReceiver}`);
  console.log(`royaltyAmount:   ${onChainRoyaltyAmount} (per 10000 sale price, ${ROYALTY_BPS} bps)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
