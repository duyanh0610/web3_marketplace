import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { RequestNonceUseCase } from "@app/modules/auth/application/request-nonce.use-case";
import { VerifySiweUseCase } from "@app/modules/auth/application/verify-siwe.use-case";
import { ACCOUNT_REPOSITORY } from "@app/modules/auth/application/ports/account-repository.port";
import { SIWE_SESSION_REPOSITORY } from "@app/modules/auth/application/ports/siwe-session-repository.port";
import { SIWE_VERIFIER } from "@app/modules/auth/application/ports/siwe-verifier.port";
import { TOKEN_ISSUER } from "@app/modules/auth/application/ports/token-issuer.port";
import { PrismaAccountRepository } from "@app/modules/auth/infrastructure/prisma-account.repository";
import { PrismaSiweSessionRepository } from "@app/modules/auth/infrastructure/prisma-siwe-session.repository";
import { SiweMessageVerifier } from "@app/modules/auth/infrastructure/siwe-message.verifier";
import { JwtTokenIssuer } from "@app/modules/auth/infrastructure/jwt-token.issuer";
import { AuthController } from "@app/modules/auth/presentation/controllers/auth.controller";
import { AuthResolver } from "@app/modules/auth/presentation/resolvers/auth.resolver";
import { AuthContextMiddleware } from "@app/modules/auth/presentation/middleware/auth-context.middleware";
import { JwtAuthGuard } from "@app/modules/auth/presentation/guards/jwt-auth.guard";
import { RequestAuthenticator } from "@app/modules/auth/presentation/services/request-authenticator";

const jwtModule = JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>("JWT_SECRET"),
  }),
});

// 5 requests per 60s per client IP — blunts basic nonce/verify spam without
// needing Redis-backed shared state (single backend instance in Phase 1,
// see docs/11-devops-cicd.md). See docs/09-security-model.md §4.
const throttlerModule = ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]);

@Module({
  imports: [jwtModule, throttlerModule],
  controllers: [AuthController],
  providers: [
    RequestNonceUseCase,
    VerifySiweUseCase,
    AuthResolver,
    AuthContextMiddleware,
    JwtAuthGuard,
    RequestAuthenticator,
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: SIWE_SESSION_REPOSITORY, useClass: PrismaSiweSessionRepository },
    { provide: SIWE_VERIFIER, useClass: SiweMessageVerifier },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
  // jwtModule re-exported so AuthContextMiddleware (applied globally from
  // AppModule.configure()) can resolve JwtService from AppModule's own
  // context — Nest resolves middleware dependencies against the module
  // that calls consumer.apply(), not the module the middleware is declared in.
  // RequestAuthenticator is exported so AppModule's GraphQLModule.forRootAsync
  // context factory can call it directly (see app.module.ts).
  exports: [ACCOUNT_REPOSITORY, AuthContextMiddleware, JwtAuthGuard, RequestAuthenticator, jwtModule],
})
export class AuthModule {}
