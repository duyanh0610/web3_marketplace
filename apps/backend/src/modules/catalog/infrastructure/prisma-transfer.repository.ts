import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";
import { TransferRecord, TransferRepository } from "@app/modules/catalog/application/ports/transfer-repository.port";

function toTransferRecord(transfer: Prisma.TransferGetPayload<Record<string, never>>): TransferRecord {
  return {
    id: transfer.id,
    fromAddress: transfer.fromAddress,
    toAddress: transfer.toAddress,
    txHash: transfer.txHash,
    blockNumber: transfer.blockNumber.toString(),
    occurredAt: transfer.occurredAt,
  };
}

@Injectable()
export class PrismaTransferRepository implements TransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenId(tokenId: string, args: { take: number; cursorId?: string }): Promise<TransferRecord[]> {
    const transfers = await this.prisma.transfer.findMany({
      where: { tokenId },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: args.take,
      ...(args.cursorId && { cursor: { id: args.cursorId }, skip: 1 }),
    });
    return transfers.map(toTransferRecord);
  }

  async findLatestByTokenId(tokenId: string): Promise<TransferRecord | null> {
    const transfer = await this.prisma.transfer.findFirst({
      where: { tokenId },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    });
    return transfer ? toTransferRecord(transfer) : null;
  }
}
