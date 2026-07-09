export interface AccountRecord {
  id: string;
  address: string;
  firstSeenAt: Date;
}

export interface AccountRepository {
  findOrCreateByAddress(address: string): Promise<AccountRecord>;
  findById(id: string): Promise<AccountRecord | null>;
}

export const ACCOUNT_REPOSITORY = Symbol("ACCOUNT_REPOSITORY");
