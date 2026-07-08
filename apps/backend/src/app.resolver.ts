import { Query, Resolver } from "@nestjs/graphql";

// Scaffold-only placeholder so the GraphQL schema has a root Query to
// generate; replaced by real module resolvers starting Milestone 1
// (AuthModule) and Milestone 6 (CatalogModule/MarketplaceModule).
@Resolver()
export class AppResolver {
  @Query(() => String)
  status(): string {
    return "ok";
  }
}
