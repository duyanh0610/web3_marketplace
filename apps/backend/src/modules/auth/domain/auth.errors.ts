import { DomainError } from "@app/shared/domain/domain-error";

export class NonceExpiredError extends DomainError {
  readonly code = "NONCE_EXPIRED";
  constructor() {
    super("SIWE nonce has expired");
  }
}

export class NonceAlreadyUsedError extends DomainError {
  readonly code = "NONCE_ALREADY_USED";
  constructor() {
    super("SIWE nonce has already been used");
  }
}

export class NonceNotFoundError extends DomainError {
  readonly code = "NONCE_NOT_FOUND";
  constructor() {
    super("SIWE nonce was not found");
  }
}

export class InvalidSignatureError extends DomainError {
  readonly code = "INVALID_SIGNATURE";
  constructor(reason?: string) {
    super(reason ? `Invalid SIWE signature: ${reason}` : "Invalid SIWE signature");
  }
}
