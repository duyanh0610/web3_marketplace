import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AccessToken, TokenIssuer } from "@app/modules/auth/application/ports/token-issuer.port";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour — re-authenticate via a fresh SIWE sign, not a long-lived refresh token (see ADR-0009).

export interface JwtPayload {
  sub: string;
  address: string;
}

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  async issue(accountId: string, address: string): Promise<AccessToken> {
    const payload: JwtPayload = { sub: accountId, address };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
    return { accessToken, expiresAt };
  }
}
