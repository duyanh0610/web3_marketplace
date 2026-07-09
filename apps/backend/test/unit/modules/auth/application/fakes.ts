import { randomUUID } from "crypto";
import {
  AccountRecord,
  AccountRepository,
} from "@app/modules/auth/application/ports/account-repository.port";
import {
  CreateSiweSessionInput,
  SiweSessionRepository,
} from "@app/modules/auth/application/ports/siwe-session-repository.port";
import { SiweVerifier, VerifiedSiweMessage } from "@app/modules/auth/application/ports/siwe-verifier.port";
import { AccessToken, TokenIssuer } from "@app/modules/auth/application/ports/token-issuer.port";
import { SiweSessionRecord } from "@app/modules/auth/domain/siwe-session";

// In-memory test doubles for the auth module's ports — used instead of a
// mocking framework so unit tests exercise real (if simplified) behavior
// rather than asserting mock-call arguments. See docs/10-testing-strategy.md §3.

export class InMemoryAccountRepository implements AccountRepository {
  private readonly byAddress = new Map<string, AccountRecord>();

  async findOrCreateByAddress(address: string): Promise<AccountRecord> {
    const key = address.toLowerCase();
    const existing = this.byAddress.get(key);
    if (existing) {
      return existing;
    }
    const account: AccountRecord = { id: randomUUID(), address, firstSeenAt: new Date() };
    this.byAddress.set(key, account);
    return account;
  }

  async findById(id: string): Promise<AccountRecord | null> {
    for (const account of this.byAddress.values()) {
      if (account.id === id) {
        return account;
      }
    }
    return null;
  }

  get size(): number {
    return this.byAddress.size;
  }
}

export class InMemorySiweSessionRepository implements SiweSessionRepository {
  private readonly byNonce = new Map<string, SiweSessionRecord>();

  async create(input: CreateSiweSessionInput): Promise<SiweSessionRecord> {
    const session: SiweSessionRecord = {
      id: randomUUID(),
      accountId: input.accountId,
      address: input.address,
      nonce: input.nonce,
      used: false,
      expiresAt: input.expiresAt,
    };
    this.byNonce.set(input.nonce, session);
    return session;
  }

  async findByNonce(nonce: string): Promise<SiweSessionRecord | null> {
    return this.byNonce.get(nonce) ?? null;
  }

  async markUsed(id: string): Promise<void> {
    for (const session of this.byNonce.values()) {
      if (session.id === id) {
        session.used = true;
      }
    }
  }
}

export class FakeSiweVerifier implements SiweVerifier {
  constructor(private readonly result: VerifiedSiweMessage | Error) {}

  async verify(): Promise<VerifiedSiweMessage> {
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}

export class FakeTokenIssuer implements TokenIssuer {
  async issue(accountId: string, address: string): Promise<AccessToken> {
    return {
      accessToken: `fake-token-for-${accountId}-${address}`,
      expiresAt: new Date(Date.now() + 3600_000),
    };
  }
}
