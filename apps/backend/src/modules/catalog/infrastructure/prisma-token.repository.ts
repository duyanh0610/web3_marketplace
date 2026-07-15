import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";
import { CollectionRecord, TokenRecord, TokenRepository } from "@app/modules/catalog/application/ports/token-repository.port";

const includeCollection = { collection: true } satisfies Prisma.TokenInclude;
type TokenWithCollection = Prisma.TokenGetPayload<{ include: typeof includeCollection }>;

function toCollectionRecord(collection: TokenWithCollection["collection"]): CollectionRecord {
  return {
    id: collection.id,
    contractAddress: collection.contractAddress,
    name: collection.name,
    symbol: collection.symbol,
  };
}

function toTokenRecord(token: TokenWithCollection): TokenRecord {
  return {
    id: token.id,
    collection: toCollectionRecord(token.collection),
    tokenId: token.tokenId.toString(),
    ownerAddress: token.ownerAddress,
    tokenUri: token.tokenUri,
    metadataCid: token.metadataCid,
    // See token-repository.port.ts: the indexer always sets these at mint
    // time even though the column is nullable.
    royaltyReceiver: token.royaltyReceiver!,
    royaltyBps: token.royaltyBps!,
  };
}

@Injectable()
export class PrismaTokenRepository implements TokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCollectionAndTokenId(contractAddress: string, tokenId: string): Promise<TokenRecord | null> {
    const token = await this.prisma.token.findFirst({
      where: { collection: { contractAddress }, tokenId: BigInt(tokenId) },
      include: includeCollection,
    });
    return token ? toTokenRecord(token) : null;
  }

  async findOwnedBy(address: string, args: { take: number; cursorId?: string }): Promise<TokenRecord[]> {
    const tokens = await this.prisma.token.findMany({
      where: { ownerAddress: address },
      include: includeCollection,
      orderBy: [{ mintedAt: "desc" }, { id: "desc" }],
      take: args.take,
      ...(args.cursorId && { cursor: { id: args.cursorId }, skip: 1 }),
    });
    return tokens.map(toTokenRecord);
  }

  async findByIds(ids: string[]): Promise<TokenRecord[]> {
    const tokens = await this.prisma.token.findMany({
      where: { id: { in: ids } },
      include: includeCollection,
    });
    return tokens.map(toTokenRecord);
  }
}
