import { Injectable } from "@nestjs/common";
import { SiweMessage } from "siwe";
import { InvalidSignatureError } from "@app/modules/auth/domain/auth.errors";
import {
  SiweVerifier,
  VerifiedSiweMessage,
} from "@app/modules/auth/application/ports/siwe-verifier.port";

@Injectable()
export class SiweMessageVerifier implements SiweVerifier {
  async verify(message: string, signature: string): Promise<VerifiedSiweMessage> {
    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch {
      throw new InvalidSignatureError("malformed SIWE message");
    }

    const result = await siweMessage.verify({ signature }).catch((error: Error) => {
      throw new InvalidSignatureError(error.message);
    });

    if (!result.success) {
      throw new InvalidSignatureError(result.error?.type ?? "signature verification failed");
    }

    return { address: siweMessage.address, nonce: siweMessage.nonce };
  }
}
