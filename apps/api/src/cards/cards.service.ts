import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { decrypt, encrypt, hashCardNumber } from '../common/card-crypto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCardDto) {
    const existing = await this.prisma.card.count({ where: { userId, status: { not: 'REMOVED' } } });
    const s = await this.prisma.setting.findUnique({ where: { key: 'bank' } });
    const maxCards = Number((s?.value as any)?.maxCardsPerCustomer) || 5;
    if (existing >= maxCards) throw new BadRequestException(`Maximum ${maxCards} cards allowed`);

    const numberHash = hashCardNumber(dto.cardNumber);
    const dup = await this.prisma.card.findUnique({ where: { numberHash } });
    if (dup) throw new BadRequestException('This card number is already registered');

    return this.prisma.card.create({
      data: {
        userId,
        walletId: dto.walletId || undefined,
        kind: 'VIRTUAL',
        label: dto.label,
        last4: dto.cardNumber.slice(-4),
        numberHash,
        numberEncrypted: encrypt(dto.cardNumber),
        cvvEncrypted: encrypt(dto.cvv),
        expMonth: dto.expMonth,
        expYear: dto.expYear,
        holderName: dto.holderName,
        color: dto.color ?? 'ink',
      },
    });
  }

  async list(userId: string) {
    const cards = await this.prisma.card.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, kind: true, label: true, last4: true, expMonth: true, expYear: true,
        holderName: true, color: true, status: true, monthlyLimitMinor: true, createdAt: true,
      },
    });
    if (!cards.length) return cards;

    // This month's completed card purchases, grouped per card and category.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const purchases = await this.prisma.transaction.findMany({
      where: {
        userId,
        cardId: { in: cards.map(c => c.id) },
        kind: 'CARD_PURCHASE',
        direction: 'OUT',
        status: 'COMPLETED',
        createdAt: { gte: monthStart },
      },
      select: { cardId: true, amountMinor: true, meta: true },
    });

    return cards.map(card => {
      const mine = purchases.filter(p => p.cardId === card.id);
      const byCategory = new Map<string, number>();
      for (const p of mine) {
        const category = String((p.meta as any)?.category ?? 'Other');
        byCategory.set(category, (byCategory.get(category) ?? 0) + p.amountMinor);
      }
      return {
        ...card,
        spentMinor: mine.reduce((sum, p) => sum + p.amountMinor, 0),
        categories: [...byCategory.entries()]
          .map(([name, amountMinor]) => ({ name, amountMinor }))
          .sort((a, b) => b.amountMinor - a.amountMinor),
      };
    });
  }

  /** Sets (or clears, with null) the card's monthly spending limit. */
  async setLimit(userId: string, id: string, monthlyLimitMinor: number | null) {
    if (monthlyLimitMinor !== null && (!Number.isInteger(monthlyLimitMinor) || monthlyLimitMinor < 0 || monthlyLimitMinor > 10_000_000_00)) {
      throw new BadRequestException('Limit must be between $0 and $10,000,000');
    }
    const card = await this.prisma.card.findFirst({ where: { id, userId, status: { not: 'REMOVED' } } });
    if (!card) throw new NotFoundException('Card not found');
    const updated = await this.prisma.card.update({ where: { id }, data: { monthlyLimitMinor } });
    return { id: updated.id, monthlyLimitMinor: updated.monthlyLimitMinor };
  }

  async get(userId: string, id: string) {
    const card = await this.prisma.card.findFirst({
      where: { id, userId },
      select: {
        id: true, kind: true, label: true, last4: true, expMonth: true,
        expYear: true, holderName: true, color: true, status: true, monthlyLimitMinor: true, createdAt: true,
      },
    });
    if (!card) throw new NotFoundException('Card not found');
    return card;
  }

  /** Decrypts the full number and CVV for the card's owner only, on demand. */
  async reveal(userId: string, id: string) {
    const card = await this.prisma.card.findFirst({
      where: { id, userId, status: { not: 'REMOVED' } },
      select: { numberEncrypted: true, cvvEncrypted: true },
    });
    if (!card) throw new NotFoundException('Card not found');
    return { number: decrypt(card.numberEncrypted), cvv: decrypt(card.cvvEncrypted) };
  }

  async freeze(userId: string, id: string) {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundException('Card not found');
    return this.prisma.card.update({ where: { id }, data: { status: card.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN' } });
  }

  async remove(userId: string, id: string) {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundException('Card not found');
    return this.prisma.card.update({ where: { id }, data: { status: 'REMOVED' } });
  }
}
