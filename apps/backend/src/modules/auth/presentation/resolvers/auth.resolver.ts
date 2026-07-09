import { Inject } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from "@app/modules/auth/application/ports/account-repository.port";
import { CurrentUser } from "@app/modules/auth/presentation/decorators/current-user.decorator";
import { AuthenticatedUser } from "@app/modules/auth/presentation/types/authenticated-user";
import { AccountType } from "@app/modules/auth/presentation/types/account.type";

@Resolver()
export class AuthResolver {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  // Resolved from the soft auth context (see AuthContextMiddleware) — no
  // guard here on purpose: null for an unauthenticated caller is the
  // documented contract (docs/13-graphql-schema.md §3), not an error.
  @Query(() => AccountType, { nullable: true })
  async me(@CurrentUser() user?: AuthenticatedUser): Promise<AccountType | null> {
    if (!user) {
      return null;
    }
    const account = await this.accounts.findById(user.accountId);
    return account ? { address: account.address, firstSeenAt: account.firstSeenAt } : null;
  }
}
