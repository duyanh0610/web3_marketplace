export interface AuthenticatedUser {
  accountId: string;
  address: string;
}

// Augment Express's Request type so `req.user` is typed everywhere it's read
// (middleware, guard, @CurrentUser() decorator) without a cast at each call site.
declare module "express" {
  interface Request {
    user?: AuthenticatedUser;
  }
}
