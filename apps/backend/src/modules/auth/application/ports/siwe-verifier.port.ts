export interface VerifiedSiweMessage {
  address: string;
  nonce: string;
}

// Wraps SIWE (EIP-4361) message parsing + cryptographic signature
// verification — an infrastructure concern (delegates to the `siwe`
// package / ethers), not a domain rule.
export interface SiweVerifier {
  verify(message: string, signature: string): Promise<VerifiedSiweMessage>;
}

export const SIWE_VERIFIER = Symbol("SIWE_VERIFIER");
