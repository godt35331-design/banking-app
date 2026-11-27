import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/deposit.dto';
import { randomBytes } from 'crypto';
import { checkLimits } from '../common/limits';

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDepositDto) {
    const wallet = await this.prisma.wallet.findFirst({ where: { id: dto.walletId, userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const ref = `DEP-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const kind = dto.type as any;
    await checkLimits(this.prisma, userId, kind, dto.amountMinor, wallet.currency);

    const isCheck = kind === 'DEPOSIT_CHECK';
    const status = isCheck ? 'PENDING' : 'COMPLETED';

    const [tx] = await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          reference: ref,
          userId,
          walletId: wallet.id,
          kind,
          direction: 'IN',
          amountMinor: dto.amountMinor,
          currency: wallet.currency,
          status,
          description: dto.description || `Deposit via ${kind.replace('DEPOSIT_', '').toLowerCase()}`,
          completedAt: isCheck ? undefined : new Date(),
          dueAt: isCheck ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : undefined,
          meta: {
            sourceBank: dto.sourceBank,
            checkNumber: dto.checkNumber,
            cashCode: dto.cashCode,
          },
        },
      }),
      ...(isCheck
        ? []
        : [
            this.prisma.wallet.update({
              where: { id: wallet.id },
              data: { balanceMinor: { increment: dto.amountMinor } },
            }),
          ]),
    ]);

    return tx;
  }

  async list(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId, kind: { in: ['DEPOSIT_BANK', 'DEPOSIT_CHECK', 'DEPOSIT_CASH'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
