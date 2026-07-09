import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { RequestAuthenticator } from "@app/modules/auth/presentation/services/request-authenticator";
import "@app/modules/auth/presentation/types/authenticated-user";

// REST-only entry point for the shared soft-auth logic — see
// RequestAuthenticator for why GraphQL needs its own separate hook
// (the GraphQLModule `context` factory) instead of relying on this
// middleware alone.
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(private readonly authenticator: RequestAuthenticator) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    req.user = await this.authenticator.authenticate(req);
    next();
  }
}
