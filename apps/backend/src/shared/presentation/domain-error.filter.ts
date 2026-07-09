import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { DomainError } from "@app/shared/domain/domain-error";

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_SIGNATURE: HttpStatus.UNAUTHORIZED,
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = STATUS_BY_CODE[exception.code] ?? HttpStatus.BAD_REQUEST;

    response.status(status).json({
      error: { code: exception.code, message: exception.message },
    });
  }
}
