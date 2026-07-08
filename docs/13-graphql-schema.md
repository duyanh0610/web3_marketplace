# 13 — GraphQL Schema

Code-first (NestJS `@nestjs/graphql` decorators generate this SDL — the file
below is the target shape, kept here as the contract between frontend and
backend even though the `.graphql` file itself is generated, not
hand-written).

## 1. Scalars & Shared Types

```graphql
scalar DateTime
scalar Wei      # string-encoded uint256, to avoid JS number precision loss

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

## 2. Core Types

```graphql
type Collection {
  id: ID!
  contractAddress: String!
  name: String!
  symbol: String!
}

type Token {
  id: ID!
  collection: Collection!
  tokenId: String!
  owner: String!
  tokenUri: String!
  metadataCid: String!
  metadata: TokenMetadata      # resolved from IPFS, nullable if unpinned/unreachable
  royaltyReceiver: String!
  royaltyBps: Int!
  transfers(first: Int = 20, after: String): TransferConnection!
  activeListing: Listing
  activeAuction: Auction
}

type TokenMetadata {
  name: String!
  description: String
  image: String!
  attributes: [MetadataAttribute!]!
}

type MetadataAttribute {
  traitType: String!
  value: String!
}

enum ListingStatus { ACTIVE CANCELLED SOLD }

type Listing {
  id: ID!
  onchainListingId: String!
  token: Token!
  seller: String!
  priceWei: Wei!
  status: ListingStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
  sale: Sale
}

enum AuctionStatus { ACTIVE SETTLED CANCELLED }

type Auction {
  id: ID!
  onchainAuctionId: String!
  token: Token!
  seller: String!
  reservePriceWei: Wei!
  highestBidWei: Wei
  highestBidder: String
  endsAt: DateTime!
  status: AuctionStatus!
  bids(first: Int = 20, after: String): BidConnection!
}

type Bid {
  id: ID!
  bidder: String!
  amountWei: Wei!
  placedAt: DateTime!
}

type Sale {
  id: ID!
  buyer: String!
  priceWei: Wei!
  royaltyPaidWei: Wei!
  feePaidWei: Wei!
  txHash: String!
  settledAt: DateTime!
}

type Transfer {
  id: ID!
  from: String!
  to: String!
  txHash: String!
  blockNumber: String!
  occurredAt: DateTime!
}

# *Connection types follow the Relay cursor-pagination convention
type TokenConnection { edges: [TokenEdge!]! pageInfo: PageInfo! }
type TokenEdge { node: Token! cursor: String! }
type TransferConnection { edges: [TransferEdge!]! pageInfo: PageInfo! }
type TransferEdge { node: Transfer! cursor: String! }
type BidConnection { edges: [BidEdge!]! pageInfo: PageInfo! }
type BidEdge { node: Bid! cursor: String! }
```

## 3. Queries

```graphql
type Query {
  listings(
    first: Int = 20
    after: String
    status: ListingStatus = ACTIVE
    sellerAddress: String
  ): ListingConnection!

  auctions(
    first: Int = 20
    after: String
    status: AuctionStatus = ACTIVE
  ): AuctionConnection!

  token(collectionAddress: String!, tokenId: String!): Token
  tokensOwnedBy(address: String!, first: Int = 20, after: String): TokenConnection!

  me: Account   # resolved from the auth context; null if unauthenticated
}

type ListingConnection { edges: [ListingEdge!]! pageInfo: PageInfo! }
type ListingEdge { node: Listing! cursor: String! }
type AuctionConnection { edges: [AuctionEdge!]! pageInfo: PageInfo! }
type AuctionEdge { node: Auction! cursor: String! }

type Account {
  address: String!
  firstSeenAt: DateTime!
}
```

## 4. Mutations

Mutations here **prepare data, never sign or submit transactions** (see
[System Architecture §3](./03-system-architecture.md#3-why-the-backend-never-signs-transactions)).
The actual `list`/`buy`/`bid`/`mint` calls happen client-side via wagmi.

```graphql
type Mutation {
  requestMetadataUpload(
    fileName: String!
    contentType: String!
  ): UploadTarget!   # returns a presigned/proxy target; actual bytes go via REST (see API Specification)
}

type UploadTarget {
  uploadUrl: String!
  expiresAt: DateTime!
}
```

Everything else that looks like a "mutation" from the user's point of view
(listing an NFT, buying, bidding) is a **blockchain transaction**, not a
GraphQL mutation — the GraphQL layer only reflects its effect after the
indexer processes it.

## 5. Subscriptions

```graphql
type Subscription {
  listingUpdated(listingId: ID): Listing!
  auctionUpdated(auctionId: ID): Auction!
  tokenTransferred(collectionAddress: String!, tokenId: String!): Transfer!
}
```

Backed by the Redis fan-out described in
[Blockchain Indexer §7](./08-blockchain-indexer.md) — a subscription
resolver is a thin adapter over the same Redis channels the
`IndexerBridgeModule` already consumes, not a second event pipeline.

## 6. Pagination & Filtering Conventions

- All list queries use Relay-style cursor pagination (`first`/`after`),
  never offset-based — offset pagination over a table that's constantly
  appended to by the indexer produces skipped/duplicated rows under load.
- Default `first` is capped server-side (max 100) to prevent unbounded
  queries.
