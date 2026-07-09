import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/shared/infrastructure/prisma.service";
import {
  AccountRecord,
  AccountRepository,
} from "@app/modules/auth/application/ports/account-repository.port";

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByAddress(address: string): Promise<AccountRecord> {
    const account = await this.prisma.account.upsert({
      where: { address },
      update: {},
      create: { address },
    });
    return { id: account.id, address: account.address, firstSeenAt: account.firstSeenAt };
  }

  async findById(id: string): Promise<AccountRecord | null> {
    const account = await this.prisma.account.findUnique({ where: { id } });
    return account
      ? { id: account.id, address: account.address, firstSeenAt: account.firstSeenAt }
      : null;
  }
}
