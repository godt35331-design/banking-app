import { BadRequestException } from '@nestjs/common';
import { DEFAULT_SETTINGS, formatMoney } from '@kestrel/shared';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Enforces the per-transaction and per-day limits from the bank settings (set by admins).
 * Limits are in USD; amounts in other currencies are converted with the bank's rates.
 */
export async function checkLimits(prisma: PrismaService, userId: string, kind: string, amountMinor: number, currency: string) {
  const s = await prisma.setting.findUnique({ where: { key: 'bank' } });
  const settings = { ...DEFAULT_SETTINGS, ...((s?.value as any) ?? {}) };
  const limit = settings.limits?.[kind];
  if (!limit) return;
  const rates: Record<string, number> = settings.ratesToUSD ?? {};
  const toUsd = (minor: number, cur: string) => Math.round(minor / (rates[cur] ?? 1));

  const usd = toUsd(amountMinor, currency);
  if (limit.perTxMinor > 0 && usd > limit.perTxMinor) {
    throw new BadRequestException(`This is above the limit of ${formatMoney(limit.perTxMinor, 'USD')} per transaction`);
  }

  if (limit.perDayMinor > 0) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const today = await prisma.transaction.findMany({
      where: { userId, kind: kind as any, createdAt: { gte: since }, status: { notIn: ['REJECTED', 'FAILED', 'DECLINED'] } },
      select: { amountMinor: true, currency: true },
    });
    const used = today.reduce((sum, t) => sum + toUsd(t.amountMinor, t.currency), 0);
    if (used + usd > limit.perDayMinor) {
      const left = Math.max(0, limit.perDayMinor - used);
      throw new BadRequestException(`This is above your daily limit of ${formatMoney(limit.perDayMinor, 'USD')}. You have ${formatMoney(left, 'USD')} left today.`);
    }
  }
}
