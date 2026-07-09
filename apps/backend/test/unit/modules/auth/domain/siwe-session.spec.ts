import { faker } from "@faker-js/faker";
import {
  assertNonceIsValid,
  nonceExpiryFrom,
  SiweSessionRecord,
} from "@app/modules/auth/domain/siwe-session";
import { NonceAlreadyUsedError, NonceExpiredError } from "@app/modules/auth/domain/auth.errors";

function makeSession(overrides: Partial<SiweSessionRecord> = {}): SiweSessionRecord {
  return {
    id: faker.string.uuid(),
    accountId: faker.string.uuid(),
    address: faker.finance.ethereumAddress(),
    nonce: faker.string.hexadecimal({ length: 32, casing: "lower", prefix: "" }),
    used: false,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

describe("assertNonceIsValid", () => {
  it("does not throw for a fresh, unused, unexpired session", () => {
    expect(() => assertNonceIsValid(makeSession(), new Date())).not.toThrow();
  });

  it("throws NonceAlreadyUsedError when used=true", () => {
    const session = makeSession({ used: true });
    expect(() => assertNonceIsValid(session, new Date())).toThrow(NonceAlreadyUsedError);
  });

  it("throws NonceExpiredError when past expiresAt", () => {
    const session = makeSession({ expiresAt: new Date(Date.now() - 1000) });
    expect(() => assertNonceIsValid(session, new Date())).toThrow(NonceExpiredError);
  });

  it("reports NonceAlreadyUsedError even if the nonce is also expired (used check first)", () => {
    const session = makeSession({ used: true, expiresAt: new Date(Date.now() - 1000) });
    expect(() => assertNonceIsValid(session, new Date())).toThrow(NonceAlreadyUsedError);
  });
});

describe("nonceExpiryFrom", () => {
  it("returns a date exactly 5 minutes after the given time", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiry = nonceExpiryFrom(now);
    expect(expiry.getTime() - now.getTime()).toBe(5 * 60 * 1000);
  });
});
