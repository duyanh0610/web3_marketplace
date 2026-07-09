import { NonceAlreadyUsedError, NonceExpiredError } from "@app/modules/auth/domain/auth.errors";

export interface SiweSessionRecord {
  id: string;
  accountId: string;
  address: string;
  nonce: string;
  used: boolean;
  expiresAt: Date;
}

const NONCE_TTL_MS = 5 * 60 * 1000;

export function nonceExpiryFrom(now: Date): Date {
  return new Date(now.getTime() + NONCE_TTL_MS);
}

// Single-use, TTL-bound nonce validity — the rule this whole auth flow's
// replay-safety depends on (see docs/09-security-model.md §4).
export function assertNonceIsValid(session: SiweSessionRecord, now: Date): void {
  if (session.used) {
    throw new NonceAlreadyUsedError();
  }
  if (session.expiresAt.getTime() < now.getTime()) {
    throw new NonceExpiredError();
  }
}
