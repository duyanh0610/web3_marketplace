import { Inject, Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { TOKEN_REPOSITORY, TokenRecord, TokenRepository } from "@app/modules/catalog/application/ports/token-repository.port";

// Request-scoped so each GraphQL request gets its own batch/cache — batches
// every Token.id lookup issued during that request's resolver tree into one
// query instead of one-per-row. This is the DataLoader called out in
// Milestone 6's Risks table for the Listing → Token (→ Collection) nested
// resolver path.
@Injectable({ scope: Scope.REQUEST })
export class TokenLoader {
  private readonly loader: DataLoader<string, TokenRecord | null>;

  constructor(@Inject(TOKEN_REPOSITORY) private readonly tokens: TokenRepository) {
    this.loader = new DataLoader<string, TokenRecord | null>((ids) => this.batchLoad(ids));
  }

  load(id: string): Promise<TokenRecord | null> {
    return this.loader.load(id);
  }

  private async batchLoad(ids: readonly string[]): Promise<(TokenRecord | null)[]> {
    const found = await this.tokens.findByIds(ids as string[]);
    const byId = new Map(found.map((token) => [token.id, token]));
    return ids.map((id) => byId.get(id) ?? null);
  }
}
