// Base for typed domain errors, mapped to stable `code` fields at the
// presentation boundary (REST exception filter, GraphQL error formatter)
// instead of being switched on by message text — see docs/05-backend-design.md §8.
export abstract class DomainError extends Error {
  abstract readonly code: string;
}
