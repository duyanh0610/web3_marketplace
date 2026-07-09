import { SiweSessionRecord } from "@app/modules/auth/domain/siwe-session";

export interface CreateSiweSessionInput {
  accountId: string;
  address: string;
  nonce: string;
  expiresAt: Date;
}

export interface SiweSessionRepository {
  create(input: CreateSiweSessionInput): Promise<SiweSessionRecord>;
  findByNonce(nonce: string): Promise<SiweSessionRecord | null>;
  markUsed(id: string): Promise<void>;
}

export const SIWE_SESSION_REPOSITORY = Symbol("SIWE_SESSION_REPOSITORY");
