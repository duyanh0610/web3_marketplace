import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { nonceExpiryFrom } from "@app/modules/auth/domain/siwe-session";
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from "@app/modules/auth/application/ports/account-repository.port";
import {
  SIWE_SESSION_REPOSITORY,
  SiweSessionRepository,
} from "@app/modules/auth/application/ports/siwe-session-repository.port";

export interface RequestNonceResult {
  nonce: string;
  expiresAt: Date;
}

@Injectable()
export class RequestNonceUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(SIWE_SESSION_REPOSITORY) private readonly sessions: SiweSessionRepository,
  ) {}

  async execute(address: string): Promise<RequestNonceResult> {
    const account = await this.accounts.findOrCreateByAddress(address);
    const nonce = randomBytes(16).toString("hex");
    const now = new Date();
    const expiresAt = nonceExpiryFrom(now);

    await this.sessions.create({
      accountId: account.id,
      address,
      nonce,
      expiresAt,
    });

    return { nonce, expiresAt };
  }
}
