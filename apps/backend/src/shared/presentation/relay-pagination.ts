// Generic Relay-style cursor pagination (see docs/13-graphql-schema.md §6).
// The cursor is just a base64-encoded row id — Prisma's own `cursor`/`skip`/
// `take` already resolves "the rows after this id, in this orderBy" without
// needing to encode the sort key itself into the cursor.

// Caps unbounded queries — see docs/13-graphql-schema.md §6.
export const MAX_PAGE_SIZE = 100;

export function clampFirst(first: number): number {
  return Math.min(Math.max(first, 1), MAX_PAGE_SIZE);
}

export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf-8").toString("base64");
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}

export interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  endCursor?: string;
}

/**
 * `fetchPage` must return up to `take` rows ordered consistently (typically
 * by the field(s) backing the query's intended sort) starting after
 * `cursorId`, if given. This helper over-fetches by one row to determine
 * `hasNextPage` without a separate count query.
 */
export async function paginate<T extends { id: string }>(
  fetchPage: (args: { take: number; cursorId?: string }) => Promise<T[]>,
  first: number,
  after?: string,
): Promise<Page<T>> {
  const cursorId = after ? decodeCursor(after) : undefined;
  const rows = await fetchPage({ take: first + 1, cursorId });
  const hasNextPage = rows.length > first;
  const items = hasNextPage ? rows.slice(0, first) : rows;
  const endCursor = items.length > 0 ? encodeCursor(items[items.length - 1].id) : undefined;
  return { items, hasNextPage, endCursor };
}
