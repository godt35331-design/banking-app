/**
 * Shared constants and types used by both the API and the web app.
 * Money is always stored and sent as integer minor units (cents/pence).
 */

export const BANK_NAME = 'Sterling Crest Bank';

export const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_META: Record<Currency, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
};

/** Transaction kinds that have their own limits (SRS FR-6.6). */
export const LIMITED_KINDS = ['DEPOSIT_BANK', 'DEPOSIT_CHECK', 'DEPOSIT_CASH', 'TRANSFER_LOCAL', 'TRANSFER_INTL'] as const;
export type LimitedKind = (typeof LIMITED_KINDS)[number];

export interface Limit {
  perTxMinor: number;
  perDayMinor: number;
}

export interface Fee {
  pct: number;
  minMinor: number;
}

/** Demo defaults. Admin can edit them; the client still has to confirm the real values (SRS 8.1). */
export interface BankSettings {
  ratesToUSD: Record<Currency, number>;
  swapMarginPct: number;
  fees: Record<LimitedKind, Fee>;
  limits: Record<LimitedKind, Limit>;
  approvalThresholdMinorUSD: number;
  maxCardsPerCustomer: number;
  pinAttempts: number;
  idleMinutes: number;
}

export const DEFAULT_SETTINGS: BankSettings = {
  ratesToUSD: { USD: 1, EUR: 0.92, GBP: 0.79 },
  swapMarginPct: 0.5,
  fees: {
    DEPOSIT_BANK: { pct: 0, minMinor: 0 },
    DEPOSIT_CHECK: { pct: 0, minMinor: 0 },
    DEPOSIT_CASH: { pct: 0, minMinor: 0 },
    TRANSFER_LOCAL: { pct: 0, minMinor: 0 },
    TRANSFER_INTL: { pct: 1.5, minMinor: 500 },
  },
  limits: {
    DEPOSIT_BANK: { perTxMinor: 1_000_000, perDayMinor: 2_500_000 },
    DEPOSIT_CHECK: { perTxMinor: 500_000, perDayMinor: 1_000_000 },
    DEPOSIT_CASH: { perTxMinor: 300_000, perDayMinor: 500_000 },
    TRANSFER_LOCAL: { perTxMinor: 500_000, perDayMinor: 1_000_000 },
    TRANSFER_INTL: { perTxMinor: 1_000_000, perDayMinor: 2_000_000 },
  },
  approvalThresholdMinorUSD: 300_000,
  maxCardsPerCustomer: 5,
  pinAttempts: 5,
  idleMinutes: 10,
};

/** Every generated card number starts with this test prefix, so it can never work on a real network. */
export const TEST_CARD_PREFIX = '424242';

export * from './tax';
export * from './recovery';
export * from './loans';
export * from './withdrawals';

export const formatMoney =(minor: number, currency: Currency): string => {
  const sign = minor < 0 ? '−' : '';
  const value = Math.abs(minor) / 100;
  return sign + CURRENCY_META[currency].symbol + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
