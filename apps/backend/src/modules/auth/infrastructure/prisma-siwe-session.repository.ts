import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";
import { SiweSessionRecord } from "@app/modules/auth/domain/siwe-session";
import {
  CreateSiweSessionInput,
  SiweSessionRepository,
} from "@app/modules/auth/application/ports/siwe-session-repository.port";

@Injectable()
export class PrismaSiweSessionRepository implements SiweSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSiweSessionInput): Promise<SiweSessionRecord> {
    const session = await this.prisma.siweSession.create({
      data: {
        accountId: input.accountId,
        address: input.address,
        nonce: input.nonce,
        expiresAt: input.expiresAt,
      },
    });
    return session;
  }

  async findByNonce(nonce: string): Promise<SiweSessionRecord | null> {
    return this.prisma.siweSession.findUnique({ where: { nonce } });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.siweSession.update({
      where: { id },
      data: { used: true },
    });
  }
}
