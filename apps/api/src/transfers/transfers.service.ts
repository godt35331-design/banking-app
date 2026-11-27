import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/transfer.dto';
import { randomBytes } from 'crypto';
import { checkLimits } from '../common/limits';
import { withTxRetry } from '../common/tx-retry';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransferDto) {
    const wallet = await this.prisma.wallet.findFirst({ where: { id: dto.walletId, userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balanceMinor < dto.amountMinor) throw new BadRequestException('Insufficient balance');

    const ref = `TXN-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const kind = dto.type as any;
    await checkLimits(this.prisma, userId, kind, dto.amountMinor, wallet.currency);

    const settings = await this.prisma.setting.findUnique({ where: { key: 'bank' } });
    const feeConfig = (settings?.value as any)?.fees?.[kind] ?? { pct: 0, minMinor: 0 };
    const feeMinor = Math.max(Math.round(dto.amountMinor * feeConfig.pct / 100), feeConfig.minMinor);
    const totalMinor = dto.amountMinor + feeMinor;

    if (wallet.balanceMinor < totalMinor) throw new BadRequestException('Insufficient balance (including fees)');

    const needsApproval = dto.amountMinor >= ((settings?.value as any)?.approvalThresholdMinorUSD ?? 300_000);

    return withTxRetry(this.prisma, async db => {
      const debited = await db.wallet.updateMany({
        where: { id: wallet.id, balanceMinor: { gte: totalMinor } },
        data: { balanceMinor: { decrement: totalMinor } },
      });
      if (debited.count === 0) throw new BadRequestException('Insufficient balance (including fees)');

      return db.transaction.create({
        data: {
          reference: ref,
          userId,
          walletId: wallet.id,
          kind,
          direction: 'OUT',
          amountMinor: dto.amountMinor,
          feeMinor,
          currency: wallet.currency,
          status: needsApproval ? 'AWAITING_APPROVAL' : 'COMPLETED',
          description: dto.description || `Transfer to ${dto.recipientName}`,
          completedAt: needsApproval ? undefined : new Date(),
          meta: {
            recipientName: dto.recipientName,
            recipientAccount: dto.recipientAccount,
            recipientBank: dto.recipientBank,
            swiftCode: dto.swiftCode,
          },
        },
      });
    });
  }

  async list(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId, kind: { in: ['TRANSFER_LOCAL', 'TRANSFER_INTL'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
