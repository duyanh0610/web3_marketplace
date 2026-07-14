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
import { AuthModule } from "@app/modules/auth/auth.module";
import { AuthContextMiddleware } from "@app/modules/auth/presentation/middleware/auth-context.middleware";
import { RequestAuthenticator } from "@app/modules/auth/presentation/services/request-authenticator";
import { MetadataModule } from "@app/modules/metadata/metadata.module";

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
        // Apollo mounts /graphql directly on the HTTP adapter, bypassing
        // Nest's controller-based middleware pipeline entirely — so the
        // soft-auth check has to happen here, not in AuthContextMiddleware
        // (which only ever sees Nest-routed REST requests). See
        // RequestAuthenticator for the shared logic both call into.
        context: async ({ req }: { req: import("express").Request }) => {
          req.user = await authenticator.authenticate(req);
          return { req };
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    MetadataModule,
  ],
  providers: [AppResolver, { provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthContextMiddleware).forRoutes("*");
  }
}
