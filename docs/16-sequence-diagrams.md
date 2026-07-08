# 16 — Sequence Diagrams

Cross-system flows referenced from other docs. "Buy Now" already appears in
[System Architecture §5](./03-system-architecture.md#5-data-flow-buy-now-illustrative);
not repeated here.

## 1. SIWE Sign-In

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant Wallet
    participant BE as Backend

    User->>FE: Click "Connect Wallet"
    FE->>Wallet: eth_requestAccounts
    Wallet-->>FE: address
    FE->>BE: POST /auth/siwe/nonce { address }
    BE-->>FE: nonce
    FE->>Wallet: sign SIWE message (EIP-4361, includes nonce, domain, chainId)
    Wallet-->>User: display full message for approval
    User-->>Wallet: approve
    Wallet-->>FE: signature
    FE->>BE: POST /auth/siwe/verify { message, signature }
    BE->>BE: verify signature, check nonce single-use + not expired
    BE-->>FE: JWT
    FE->>FE: store JWT, attach to future GraphQL requests
```

## 2. Mint NFT

```mermaid
sequenceDiagram
    actor Creator
    participant FE as Frontend
    participant BE as Backend
    participant IPFS
    participant NFT as NFT Contract
    participant IDX as Indexer

    Creator->>FE: Fill mint form (image, name, royalty %)
    FE->>BE: POST /metadata/upload (image + metadata)
    BE->>IPFS: pin image, then pin metadata JSON referencing image CID
    IPFS-->>BE: imageCid, metadataCid
    BE-->>FE: tokenUri = ipfs://metadataCid
    FE->>NFT: mint(to, tokenUri, royaltyReceiver, royaltyBps) [signed by Creator]
    NFT-->>FE: tx hash
    NFT->>IDX: emits Transfer(0x0 -> Creator, tokenId)
    IDX->>IDX: decode, upsert TOKEN, insert TRANSFER
    FE->>FE: poll/subscribe until token appears in "My NFTs"
```

## 3. List for Fixed Price

```mermaid
sequenceDiagram
    actor Seller
    participant FE as Frontend
    participant NFT as NFT Contract
    participant MKT as Marketplace Contract
    participant IDX as Indexer

    Seller->>FE: Click "List for sale", enter price
    FE->>NFT: approve(marketplaceAddress, tokenId) [if not already approved]
    NFT-->>FE: tx confirmed
    FE->>MKT: list(nftAddress, tokenId, priceWei) [signed by Seller]
    MKT->>MKT: verify Seller owns token & has approved Marketplace
    MKT-->>FE: emits Listed(listingId, ...)
    MKT->>IDX: Listed event
    IDX->>IDX: insert LISTING (status ACTIVE)
```

## 4. Place Bid / Settle Auction

```mermaid
sequenceDiagram
    actor Bidder
    actor OtherBidder as Previous Highest Bidder
    participant FE as Frontend
    participant MKT as Marketplace Contract (Auction module)
    participant IDX as Indexer

    Bidder->>FE: Enter bid amount
    FE->>MKT: bid(auctionId) [value = amount, signed by Bidder]
    MKT->>MKT: check amount > highestBid + minIncrement
    MKT->>MKT: credit OtherBidder.pendingWithdrawals (never force-send)
    MKT-->>FE: emits BidPlaced
    MKT->>IDX: BidPlaced event
    IDX->>IDX: update AUCTION.highestBid*, insert BID
    OtherBidder->>FE: (later) Click "Withdraw outbid amount"
    FE->>MKT: withdraw()
    MKT-->>OtherBidder: transfer pendingWithdrawals[OtherBidder]

    Note over MKT: time passes, endsAt reached
    actor Anyone
    Anyone->>MKT: settle(auctionId)
    MKT->>MKT: checks-effects-interactions: mark SETTLED, transfer NFT to winner,<br/>credit seller/royalty/fee pendingWithdrawals
    MKT-->>IDX: emits AuctionSettled
    IDX->>IDX: update AUCTION.status = SETTLED, insert SALE
```

## 5. Reorg Detection & Rewind (Indexer)

```mermaid
sequenceDiagram
    participant IDX as Indexer
    participant DB as PostgreSQL
    participant Chain as Sepolia RPC

    IDX->>DB: read INDEXER_CURSOR (lastIndexedBlock=N, hash=H)
    IDX->>Chain: getBlock(N)
    Chain-->>IDX: block N', hash H'
    alt H == H'
        IDX->>Chain: getLogs(N+1..tip-CONFIRMATIONS)
        IDX->>DB: apply new logs, advance cursor
    else H != H' (reorg detected)
        loop walk backward
            IDX->>Chain: getBlock(N-1), compare hash to stored value
        end
        IDX->>DB: delete projection rows tied to orphaned block range
        IDX->>DB: reset cursor to common ancestor
        IDX->>Chain: getLogs(commonAncestor+1..tip-CONFIRMATIONS)
        IDX->>DB: re-apply logs, advance cursor
    end
```
