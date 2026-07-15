import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { GqlExceptionFilter } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Response } from "express";
import { DomainError } from "@app/shared/domain/domain-error";

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_SIGNATURE: HttpStatus.UNAUTHORIZED,
  METADATA_PINNING_FAILED: HttpStatus.BAD_GATEWAY,
};

// Handles both REST and GraphQL (docs/05-backend-design.md §8: "a global
// GraphQL exception filter... the frontend switches on `code`, never on
// message text") in one filter rather than two competing `@Catch(DomainError)`
// globals — NestJS's exception-filter dispatch matches by exception type,
// not by transport, so two separately-registered global filters for the
// same exception class would race and the losing transport could crash
// trying to use the wrong host API (e.g. `switchToHttp()` against a
// GraphQL execution). Same branching pattern already used by
// JwtAuthGuard/CurrentUser for this exact REST-vs-GraphQL split.
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter, GqlExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void | GraphQLError {
    if (host.getType<"graphql">() === "graphql") {
      return new GraphQLError(exception.message, {
        extensions: { code: exception.code },
      });
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = STATUS_BY_CODE[exception.code] ?? HttpStatus.BAD_REQUEST;

    response.status(status).json({
      error: { code: exception.code, message: exception.message },
    });
  }
}
