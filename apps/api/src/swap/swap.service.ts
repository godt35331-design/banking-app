import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSwapDto } from './dto/swap.dto';
import { randomBytes } from 'crypto';
import { generateAccountNumber } from '../common/card-crypto';

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

    let toWallet = await this.prisma.wallet.findFirst({ where: { userId, currency: dto.toCurrency } });
    if (!toWallet) {
      toWallet = await this.prisma.wallet.create({
        data: { userId, currency: dto.toCurrency, accountNumber: generateAccountNumber() },
      });
    }

    const quote = await this.getQuote(fromWallet.currency, dto.toCurrency, dto.amountMinor);
    const groupRef = `SWP-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const [outTx] = await this.prisma.$transaction([
      this.prisma.transaction.create({
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
      }),
      this.prisma.transaction.create({
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
      }),
      this.prisma.wallet.update({
        where: { id: fromWallet.id },
        data: { balanceMinor: { decrement: dto.amountMinor } },
      }),
      this.prisma.wallet.update({
        where: { id: toWallet.id },
        data: { balanceMinor: { increment: quote.toAmountMinor } },
      }),
    ]);

    return { ...outTx, quote };
  }
}
