// Carries the backend's stable `error.code` (see
// apps/backend/src/shared/presentation/domain-error.filter.ts) alongside the
// raw English `message`, so callers can map `code` to a translated string
// and fall back to `message` only when no translation exists for that code.
export class ApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
