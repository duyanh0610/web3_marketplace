import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Request } from "express";
import { AuthenticatedUser } from "@app/modules/auth/presentation/types/authenticated-user";

function extractRequest(context: ExecutionContext): Request {
  if (context.getType<"graphql">() === "graphql") {
    return GqlExecutionContext.create(context).getContext().req;
  }
  return context.switchToHttp().getRequest();
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    return extractRequest(context).user;
  },
);
