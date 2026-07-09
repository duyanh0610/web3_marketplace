import { Inject, Injectable } from "@nestjs/common";
import { assertNonceIsValid } from "@app/modules/auth/domain/siwe-session";
import { InvalidSignatureError, NonceNotFoundError } from "@app/modules/auth/domain/auth.errors";
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from "@app/modules/auth/application/ports/account-repository.port";
import {
  SIWE_SESSION_REPOSITORY,
  SiweSessionRepository,
} from "@app/modules/auth/application/ports/siwe-session-repository.port";
import { SIWE_VERIFIER, SiweVerifier } from "@app/modules/auth/application/ports/siwe-verifier.port";
import {
  TOKEN_ISSUER,
  TokenIssuer,
  AccessToken,
} from "@app/modules/auth/application/ports/token-issuer.port";

export interface VerifySiweResult extends AccessToken {
  address: string;
}

@Injectable()
export class VerifySiweUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(SIWE_SESSION_REPOSITORY) private readonly sessions: SiweSessionRepository,
    @Inject(SIWE_VERIFIER) private readonly siweVerifier: SiweVerifier,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
  ) {}

  async execute(message: string, signature: string): Promise<VerifySiweResult> {
    const verified = await this.siweVerifier.verify(message, signature);

    const session = await this.sessions.findByNonce(verified.nonce);
    if (!session) {
      throw new NonceNotFoundError();
    }

    assertNonceIsValid(session, new Date());

    if (session.address.toLowerCase() !== verified.address.toLowerCase()) {
      throw new InvalidSignatureError("address does not match the nonce it was issued to");
    }

    await this.sessions.markUsed(session.id);

    const account = await this.accounts.findOrCreateByAddress(verified.address);
    const token = await this.tokenIssuer.issue(account.id, account.address);

    return { ...token, address: account.address };
  }
}
