import { join } from "path";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { AppResolver } from "@app/app.resolver";
import { PrismaModule } from "@app/shared/infrastructure/prisma.module";
import { DomainErrorFilter } from "@app/shared/presentation/domain-error.filter";
import { WeiScalar } from "@app/shared/presentation/scalars/wei.scalar";
import { AuthModule } from "@app/modules/auth/auth.module";
import { AuthContextMiddleware } from "@app/modules/auth/presentation/middleware/auth-context.middleware";
import { RequestAuthenticator } from "@app/modules/auth/presentation/services/request-authenticator";
import { MetadataModule } from "@app/modules/metadata/metadata.module";
import { CatalogModule } from "@app/modules/catalog/catalog.module";
import { MarketplaceModule } from "@app/modules/marketplace/marketplace.module";
import { IndexerBridgeModule } from "@app/modules/indexer-bridge/indexer-bridge.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.getOrThrow<string>("REDIS_URL"));
        return {
          connection: { host: redisUrl.hostname, port: Number(redisUrl.port) },
        };
      },
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule],
      inject: [RequestAuthenticator],
      useFactory: (authenticator: RequestAuthenticator) => ({
        autoSchemaFile: join(process.cwd(), "src/schema.gql"),
        sortSchema: true,
        // Enables the graphql-ws WS transport for Subscription resolvers
        // (docs/13-graphql-schema.md §5) — see IndexerBridgeModule for
        // what actually feeds them.
        subscriptions: {
          "graphql-ws": true,
        },
        // Apollo mounts /graphql directly on the HTTP adapter, bypassing
        // Nest's controller-based middleware pipeline entirely — so the
        // soft-auth check has to happen here, not in AuthContextMiddleware
        // (which only ever sees Nest-routed REST requests). See
        // RequestAuthenticator for the shared logic both call into.
        //
        // This factory is called with a *different* shape depending on
        // transport: Apollo's HTTP path passes `{ req }`, but
        // @nestjs/graphql forwards this same option straight into
        // graphql-ws's `useServer` for WS subscriptions (see
        // GqlSubscriptionService), whose own context factory instead
        // receives graphql-ws's `Context`, carrying the raw upgrade
        // request at `.extra.request` — not `.req`. Destructuring only
        // `{ req }` left it `undefined` for every subscription and crashed
        // on `req.headers` the moment a client connected.
        context: async (params: { req: import("express").Request } | { extra: { request: import("express").Request } }) => {
          const req = "req" in params ? params.req : params.extra.request;
          req.user = await authenticator.authenticate(req);
          return { req };
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    MetadataModule,
    CatalogModule,
    MarketplaceModule,
    IndexerBridgeModule,
  ],
  providers: [AppResolver, WeiScalar, { provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthContextMiddleware).forRoutes("*");
  }
}
