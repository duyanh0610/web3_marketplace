import { faker } from "@faker-js/faker";
import { HDNodeWallet, Wallet } from "ethers";
import { SiweMessage } from "siwe";
import { SiweMessageVerifier } from "@app/modules/auth/infrastructure/siwe-message.verifier";
import { InvalidSignatureError } from "@app/modules/auth/domain/auth.errors";

// EIP-4361 nonces must be alphanumeric (the siwe-parser ABNF grammar
// rejects hyphens/underscores) — matches how RequestNonceUseCase generates
// nonces via randomBytes().toString("hex") in production.
function randomNonce(): string {
  return faker.string.alphanumeric(16);
}

// Wallet.createRandom() returns HDNodeWallet, not Wallet — accept either
// since both expose .address and .signMessage().
async function buildSignedMessage(wallet: Wallet | HDNodeWallet, nonce: string) {
  const siweMessage = new SiweMessage({
    domain: "localhost",
    address: wallet.address,
    statement: "Sign in to Web3 NFT Marketplace",
    uri: "http://localhost:3000",
    version: "1",
    chainId: 11155111,
    nonce,
  });
  const message = siweMessage.prepareMessage();
  const signature = await wallet.signMessage(message);
  return { message, signature };
}

describe("SiweMessageVerifier (real cryptographic verification)", () => {
  it("returns the address and nonce for a validly signed message", async () => {
    const wallet = Wallet.createRandom();
    const nonce = randomNonce();
    const { message, signature } = await buildSignedMessage(wallet, nonce);
    const verifier = new SiweMessageVerifier();

    const result = await verifier.verify(message, signature);

    expect(result.address).toBe(wallet.address);
    expect(result.nonce).toBe(nonce);
  });

  it("throws InvalidSignatureError for a tampered signature", async () => {
    const wallet = Wallet.createRandom();
    const { message, signature } = await buildSignedMessage(wallet, randomNonce());
    const tamperedSignature = signature.slice(0, -4) + "dead";
    const verifier = new SiweMessageVerifier();

    await expect(verifier.verify(message, tamperedSignature)).rejects.toThrow(
      InvalidSignatureError,
    );
  });

  it("throws InvalidSignatureError when the signature belongs to a different wallet", async () => {
    const signer = Wallet.createRandom();
    const impersonated = Wallet.createRandom();
    // Message claims to be from `impersonated`, but is signed by `signer`.
    const siweMessage = new SiweMessage({
      domain: "localhost",
      address: impersonated.address,
      statement: "Sign in to Web3 NFT Marketplace",
      uri: "http://localhost:3000",
      version: "1",
      chainId: 11155111,
      nonce: randomNonce(),
    });
    const message = siweMessage.prepareMessage();
    const signature = await signer.signMessage(message);
    const verifier = new SiweMessageVerifier();

    await expect(verifier.verify(message, signature)).rejects.toThrow(InvalidSignatureError);
  });

  it("throws InvalidSignatureError for a malformed message string", async () => {
    const verifier = new SiweMessageVerifier();

    await expect(verifier.verify("not a real siwe message", "0xdeadbeef")).rejects.toThrow(
      InvalidSignatureError,
    );
  });
});
