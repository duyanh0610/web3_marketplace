export interface AccessToken {
  accessToken: string;
  expiresAt: Date;
}

export interface TokenIssuer {
  issue(accountId: string, address: string): Promise<AccessToken>;
}

export const TOKEN_ISSUER = Symbol("TOKEN_ISSUER");
