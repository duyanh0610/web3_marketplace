import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Request } from "express";

// Hard guard: throws if AuthContextMiddleware didn't attach a user (missing
// or invalid token). Not yet applied to any route/resolver in Milestone 1 —
// it exists for later milestones' protected mutations — but is implemented
// and unit-testable now per the milestone's stated scope.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = this.extractRequest(context);
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractRequest(context: ExecutionContext): Request {
    if (context.getType<"graphql">() === "graphql") {
      return GqlExecutionContext.create(context).getContext().req;
    }
    return context.switchToHttp().getRequest();
  }
}
