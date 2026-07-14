import { ConfigService } from "@nestjs/config";
import { PinataPinStatusChecker } from "@app/modules/metadata/infrastructure/pinata-pin-status.checker";

function fakeConfigService(values: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`missing config: ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("PinataPinStatusChecker", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function build(): PinataPinStatusChecker {
    return new PinataPinStatusChecker(fakeConfigService({ PINATA_JWT: "fake-jwt" }));
  }

  it("returns true when the v3 files API reports at least one matching file", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse(200, { data: { files: [{ cid: "some-cid" }], next_page_token: null } }),
    );
    const checker = build();

    await expect(checker.isPinned("some-cid")).resolves.toBe(true);
  });

  it("returns false when the v3 files API reports no matching files", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { data: { files: [], next_page_token: null } }));
    const checker = build();

    await expect(checker.isPinned("unknown-cid")).resolves.toBe(false);
  });

  it("returns false when the request itself fails", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse(401, { error: "not authenticated" }));
    const checker = build();

    await expect(checker.isPinned("some-cid")).resolves.toBe(false);
  });

  it("sends the JWT as a Bearer token", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { data: { files: [], next_page_token: null } }));
    const checker = build();

    await checker.isPinned("some-cid");

    const [, requestInit] = fetchSpy.mock.calls[0];
    expect((requestInit?.headers as Record<string, string>).Authorization).toBe("Bearer fake-jwt");
  });
});
