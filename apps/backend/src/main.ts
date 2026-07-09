import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "@app/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  // The frontend runs on a different origin (different port counts as a
  // different origin) — without this, every browser fetch fails with
  // "Failed to fetch" during the CORS preflight, before the request ever
  // reaches a route (curl/node scripts don't enforce CORS, which is why
  // this was missed by earlier fetch-based verification).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });
  // REST surface lives under /api/v1 (see docs/12-api-specification.md);
  // GraphQL is mounted separately by Apollo at /graphql and is unaffected
  // by this prefix since it isn't registered via a Nest @Controller route.
  app.setGlobalPrefix("api/v1");
  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
