import {
  clampFirst,
  decodeCursor,
  encodeCursor,
  MAX_PAGE_SIZE,
  paginate,
} from "@app/shared/presentation/relay-pagination";

describe("clampFirst", () => {
  it("passes values within range through unchanged", () => {
    expect(clampFirst(20)).toBe(20);
  });

  it("clamps below 1 up to 1", () => {
    expect(clampFirst(0)).toBe(1);
    expect(clampFirst(-5)).toBe(1);
  });

  it("clamps above MAX_PAGE_SIZE down to it", () => {
    expect(clampFirst(1000)).toBe(MAX_PAGE_SIZE);
  });
});

describe("encodeCursor / decodeCursor", () => {
  it("round-trips an id through base64", () => {
    const id = "a1b2c3-real-uuid";
    expect(decodeCursor(encodeCursor(id))).toBe(id);
  });
});

describe("paginate", () => {
  function row(id: string) {
    return { id };
  }

  it("returns hasNextPage=false and no endCursor when fewer rows exist than requested", async () => {
    const fetchPage = jest.fn().mockResolvedValue([row("1"), row("2")]);

    const page = await paginate(fetchPage, 5);

    expect(fetchPage).toHaveBeenCalledWith({ take: 6, cursorId: undefined });
    expect(page.items).toEqual([row("1"), row("2")]);
    expect(page.hasNextPage).toBe(false);
    expect(page.endCursor).toBe(encodeCursor("2"));
  });

  it("over-fetches by one to detect hasNextPage=true and trims it off the returned items", async () => {
    const fetchPage = jest.fn().mockResolvedValue([row("1"), row("2"), row("3")]);

    const page = await paginate(fetchPage, 2);

    expect(page.items).toEqual([row("1"), row("2")]);
    expect(page.hasNextPage).toBe(true);
    expect(page.endCursor).toBe(encodeCursor("2"));
  });

  it("decodes the `after` cursor into cursorId before calling fetchPage", async () => {
    const fetchPage = jest.fn().mockResolvedValue([]);

    await paginate(fetchPage, 10, encodeCursor("previous-id"));

    expect(fetchPage).toHaveBeenCalledWith({ take: 11, cursorId: "previous-id" });
  });

  it("returns no endCursor when there are no rows", async () => {
    const fetchPage = jest.fn().mockResolvedValue([]);

    const page = await paginate(fetchPage, 10);

    expect(page.endCursor).toBeUndefined();
    expect(page.hasNextPage).toBe(false);
  });
});
