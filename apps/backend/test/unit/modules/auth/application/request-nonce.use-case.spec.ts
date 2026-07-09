import { faker } from "@faker-js/faker";
import { RequestNonceUseCase } from "@app/modules/auth/application/request-nonce.use-case";
import { InMemoryAccountRepository, InMemorySiweSessionRepository } from "./fakes";

describe("RequestNonceUseCase", () => {
  function setup() {
    const accounts = new InMemoryAccountRepository();
    const sessions = new InMemorySiweSessionRepository();
    const useCase = new RequestNonceUseCase(accounts, sessions);
    return { accounts, sessions, useCase };
  }

  it("creates a session with a nonce and a future expiry", async () => {
    const { sessions, useCase } = setup();
    const address = faker.finance.ethereumAddress();

    const result = await useCase.execute(address);

    expect(result.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const session = await sessions.findByNonce(result.nonce);
    expect(session).not.toBeNull();
    expect(session?.address).toBe(address);
    expect(session?.used).toBe(false);
  });

  it("creates exactly one account for a new address", async () => {
    const { accounts, useCase } = setup();
    const address = faker.finance.ethereumAddress();

    await useCase.execute(address);

    expect(accounts.size).toBe(1);
  });

  it("reuses the same account across repeated requests for the same address", async () => {
    const { accounts, useCase } = setup();
    const address = faker.finance.ethereumAddress();

    await useCase.execute(address);
    await useCase.execute(address);
    await useCase.execute(address);

    expect(accounts.size).toBe(1);
  });

  it("creates a separate account per distinct address", async () => {
    const { accounts, useCase } = setup();

    await useCase.execute(faker.finance.ethereumAddress());
    await useCase.execute(faker.finance.ethereumAddress());

    expect(accounts.size).toBe(2);
  });

  it("generates a different nonce on each call, even for the same address", async () => {
    const { useCase } = setup();
    const address = faker.finance.ethereumAddress();

    const first = await useCase.execute(address);
    const second = await useCase.execute(address);

    expect(first.nonce).not.toBe(second.nonce);
  });
});
