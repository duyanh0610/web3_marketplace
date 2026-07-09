import { faker } from "@faker-js/faker";
import { VerifySiweUseCase } from "@app/modules/auth/application/verify-siwe.use-case";
import {
  FakeSiweVerifier,
  FakeTokenIssuer,
  InMemoryAccountRepository,
  InMemorySiweSessionRepository,
} from "./fakes";
import {
  InvalidSignatureError,
  NonceAlreadyUsedError,
  NonceExpiredError,
  NonceNotFoundError,
} from "@app/modules/auth/domain/auth.errors";

describe("VerifySiweUseCase", () => {
  async function setup(sessionOverrides: { expiresAt?: Date } = {}) {
    const accounts = new InMemoryAccountRepository();
    const sessions = new InMemorySiweSessionRepository();
    const address = faker.finance.ethereumAddress();
    const nonce = faker.string.hexadecimal({ length: 32, casing: "lower", prefix: "" });

    const account = await accounts.findOrCreateByAddress(address);
    const session = await sessions.create({
      accountId: account.id,
      address,
      nonce,
      expiresAt: sessionOverrides.expiresAt ?? new Date(Date.now() + 60_000),
    });

    return { accounts, sessions, account, session, address, nonce };
  }

  function makeUseCase(
    accounts: InMemoryAccountRepository,
    sessions: InMemorySiweSessionRepository,
    verifier: FakeSiweVerifier,
  ) {
    return new VerifySiweUseCase(accounts, sessions, verifier, new FakeTokenIssuer());
  }

  it("succeeds for a valid, unused, unexpired nonce with a matching address", async () => {
    const { accounts, sessions, address, nonce } = await setup();
    const verifier = new FakeSiweVerifier({ address, nonce });
    const useCase = makeUseCase(accounts, sessions, verifier);

    const result = await useCase.execute("dummy-message", "dummy-signature");

    expect(result.address).toBe(address);
    expect(result.accessToken).toContain("fake-token-for");

    const usedSession = await sessions.findByNonce(nonce);
    expect(usedSession?.used).toBe(true);
  });

  it("throws NonceNotFoundError for an unknown nonce", async () => {
    const { accounts, sessions, address } = await setup();
    const verifier = new FakeSiweVerifier({ address, nonce: "does-not-exist" });
    const useCase = makeUseCase(accounts, sessions, verifier);

    await expect(useCase.execute("m", "s")).rejects.toThrow(NonceNotFoundError);
  });

  it("throws NonceAlreadyUsedError for a replayed nonce", async () => {
    const { accounts, sessions, session, address, nonce } = await setup();
    await sessions.markUsed(session.id);
    const verifier = new FakeSiweVerifier({ address, nonce });
    const useCase = makeUseCase(accounts, sessions, verifier);

    await expect(useCase.execute("m", "s")).rejects.toThrow(NonceAlreadyUsedError);
  });

  it("throws NonceExpiredError for an expired nonce", async () => {
    const { accounts, sessions, address, nonce } = await setup({
      expiresAt: new Date(Date.now() - 1000),
    });
    const verifier = new FakeSiweVerifier({ address, nonce });
    const useCase = makeUseCase(accounts, sessions, verifier);

    await expect(useCase.execute("m", "s")).rejects.toThrow(NonceExpiredError);
  });

  it("throws InvalidSignatureError when the verified address doesn't match the session's address", async () => {
    const { accounts, sessions, nonce } = await setup();
    const verifier = new FakeSiweVerifier({ address: faker.finance.ethereumAddress(), nonce });
    const useCase = makeUseCase(accounts, sessions, verifier);

    await expect(useCase.execute("m", "s")).rejects.toThrow(InvalidSignatureError);
  });

  it("propagates InvalidSignatureError from the verifier itself (bad cryptographic signature)", async () => {
    const { accounts, sessions } = await setup();
    const verifier = new FakeSiweVerifier(
      new InvalidSignatureError("signature does not match address"),
    );
    const useCase = makeUseCase(accounts, sessions, verifier);

    await expect(useCase.execute("m", "bad-signature")).rejects.toThrow(InvalidSignatureError);
  });

  it("does not mark the nonce as used when verification fails downstream", async () => {
    const { accounts, sessions, nonce } = await setup();
    const verifier = new FakeSiweVerifier({ address: faker.finance.ethereumAddress(), nonce });
    const useCase = makeUseCase(accounts, sessions, verifier);

    await expect(useCase.execute("m", "s")).rejects.toThrow(InvalidSignatureError);

    const session = await sessions.findByNonce(nonce);
    expect(session?.used).toBe(false);
  });
});
