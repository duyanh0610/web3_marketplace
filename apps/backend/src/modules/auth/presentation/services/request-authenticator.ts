import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { JwtPayload } from "@app/modules/auth/infrastructure/jwt-token.issuer";
import { AuthenticatedUser } from "@app/modules/auth/presentation/types/authenticated-user";

// Shared "soft" authentication logic: parse + verify a Bearer token if
// present, never throw. Used by both AuthContextMiddleware (REST — Nest's
// controller routing) and the GraphQL context factory (Apollo's endpoint is
// mounted directly on the HTTP adapter, outside Nest's middleware pipeline,
// so it needs this called explicitly rather than relying on `configure()`).
@Injectable()
export class RequestAuthenticator {
  constructor(private readonly jwt: JwtService) {}

  async authenticate(req: Request): Promise<AuthenticatedUser | undefined> {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return undefined;
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return { accountId: payload.sub, address: payload.address };
    } catch {
      return undefined;
    }
  }
}
