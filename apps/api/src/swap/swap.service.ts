import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSwapDto } from './dto/swap.dto';
import { randomBytes } from 'crypto';
import { generateAccountNumber } from '../common/card-crypto';
import { withTxRetry } from '../common/tx-retry';

@Injectable()
export class SwapService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuote(fromCurrency: string, toCurrency: string, amountMinor: number) {
    const settings = await this.prisma.setting.findUnique({ where: { key: 'bank' } });
    const rates = (settings?.value as any)?.ratesToUSD ?? { USD: 1, EUR: 0.92, GBP: 0.79 };
    const margin = (settings?.value as any)?.swapMarginPct ?? 0.5;

    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[toCurrency] ?? 1;
    const rawRate = toRate / fromRate;
    const effectiveRate = rawRate * (1 + margin / 100);
    const toAmountMinor = Math.round(amountMinor * effectiveRate);

    return { fromCurrency, toCurrency, amountMinor, toAmountMinor, rate: effectiveRate, marginPct: margin };
  }

  async execute(userId: string, dto: CreateSwapDto) {
    const fromWallet = await this.prisma.wallet.findFirst({ where: { id: dto.fromWalletId, userId } });
    if (!fromWallet) throw new NotFoundException('Source wallet not found');
    if (fromWallet.currency === dto.toCurrency) throw new BadRequestException('Cannot swap to the same currency');
    if (fromWallet.balanceMinor < dto.amountMinor) throw new BadRequestException('Insufficient balance');

    // upsert, so two parallel swaps into a new currency don't both try to create the wallet
    const toWallet = await this.prisma.wallet.upsert({
      where: { userId_currency: { userId, currency: dto.toCurrency } },
      create: { userId, currency: dto.toCurrency, accountNumber: generateAccountNumber() },
      update: {},
    });

    const quote = await this.getQuote(fromWallet.currency, dto.toCurrency, dto.amountMinor);
    const groupRef = `SWP-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const outTx = await withTxRetry(this.prisma, async db => {
      const debited = await db.wallet.updateMany({
        where: { id: fromWallet.id, balanceMinor: { gte: dto.amountMinor } },
        data: { balanceMinor: { decrement: dto.amountMinor } },
      });
      if (debited.count === 0) throw new BadRequestException('Insufficient balance');

      await db.wallet.update({
        where: { id: toWallet.id },
        data: { balanceMinor: { increment: quote.toAmountMinor } },
      });

      await db.transaction.create({
        data: {
          reference: `${groupRef}-IN`,
          groupRef,
          userId,
          walletId: toWallet.id,
          kind: 'SWAP',
          direction: 'IN',
          amountMinor: quote.toAmountMinor,
          currency: dto.toCurrency,
          status: 'COMPLETED',
          description: `Swap ${fromWallet.currency} → ${dto.toCurrency}`,
          completedAt: new Date(),
        },
      });

      return db.transaction.create({
        data: {
          reference: `${groupRef}-OUT`,
          groupRef,
          userId,
          walletId: fromWallet.id,
          kind: 'SWAP',
          direction: 'OUT',
          amountMinor: dto.amountMinor,
          currency: fromWallet.currency,
          status: 'COMPLETED',
          description: `Swap ${fromWallet.currency} → ${dto.toCurrency}`,
          completedAt: new Date(),
        },
      });
    });

    return { ...outTx, quote };
  }
}
