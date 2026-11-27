import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateAccountNumber } from '../common/card-crypto';
import { Currency } from '@prisma/client';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, currency: Currency) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId_currency: { userId, currency } } });
    if (existing) throw new ConflictException(`You already have a ${currency} wallet`);

    return this.prisma.wallet.create({
      data: { userId, currency, accountNumber: generateAccountNumber() },
    });
  }

  async list(userId: string) {
    return this.prisma.wallet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async get(userId: string, id: string) {
    const wallet = await this.prisma.wallet.findFirst({ where: { id, userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async totalBalanceMinor(userId: string) {
    const wallets = await this.prisma.wallet.findMany({ where: { userId } });
    const settings = await this.prisma.setting.findUnique({ where: { key: 'bank' } });
    const rates = (settings?.value as any)?.ratesToUSD ?? { USD: 1, EUR: 0.92, GBP: 0.79 };
    let totalUsdMinor = 0;
    for (const w of wallets) {
      totalUsdMinor += Math.round(w.balanceMinor / (rates[w.currency] ?? 1));
    }
    return { totalUsdMinor, wallets };
  }
}
