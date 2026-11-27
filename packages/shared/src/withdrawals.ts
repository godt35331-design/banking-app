/**
 * Withdrawals from a wallet to the customer's own bank account or crypto wallet.
 * Shared by the web form and the API so both apply the same checks.
 *
 * The bank reviews each withdrawal and sends it; until then the amount is reserved in the wallet.
 * No private keys or recovery phrases are ever asked for: only the public receiving address.
 */
import { RECOVERY_COUNTRIES } from './recovery';

export type WithdrawalMethod = 'BANK' | 'CRYPTO';

export interface CryptoNetwork {
  key: string;
  label: string;
  /** What a valid receiving address looks like on this network. */
  pattern: RegExp;
  example: string;
  /** Some networks need a memo/tag for exchange deposits. */
  memo?: boolean;
}

const EVM = /^0x[a-fA-F0-9]{40}$/;
const NETWORKS: Record<string, CryptoNetwork> = {
  BTC: { key: 'BTC', label: 'Bitcoin', pattern: /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/, example: 'bc1q…' },
  ETH: { key: 'ETH', label: 'Ethereum (ERC-20)', pattern: EVM, example: '0x…' },
  TRX: { key: 'TRX', label: 'Tron (TRC-20)', pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, example: 'T…' },
  BSC: { key: 'BSC', label: 'BNB Smart Chain (BEP-20)', pattern: EVM, example: '0x…' },
  POLYGON: { key: 'POLYGON', label: 'Polygon', pattern: EVM, example: '0x…' },
  SOL: { key: 'SOL', label: 'Solana', pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, example: 'e.g. 7xKX…' },
};

/** Coins the bank can send, and the networks each one can go on. */
export const CRYPTO_ASSETS: { key: string; label: string; networks: CryptoNetwork[] }[] = [
  { key: 'USDT', label: 'Tether (USDT)', networks: [NETWORKS.TRX, NETWORKS.ETH, NETWORKS.BSC] },
  { key: 'USDC', label: 'USD Coin (USDC)', networks: [NETWORKS.ETH, NETWORKS.SOL, NETWORKS.POLYGON] },
  { key: 'BTC', label: 'Bitcoin (BTC)', networks: [NETWORKS.BTC] },
  { key: 'ETH', label: 'Ether (ETH)', networks: [NETWORKS.ETH] },
];

export const cryptoAsset = (key: string) => CRYPTO_ASSETS.find(a => a.key === key);
export const cryptoNetwork = (asset: string, network: string) => cryptoAsset(asset)?.networks.find(n => n.key === network);

export const WITHDRAWAL_COUNTRIES = RECOVERY_COUNTRIES;
export const WITHDRAWAL_MIN_MINOR = 100; // 1.00 in the wallet currency

export interface BankDestination { accountHolder: string; bankName: string; accountNumber: string; swift?: string; country: string }
export interface CryptoDestination { asset: string; network: string; address: string; memo?: string }

/** Errors for a withdrawal form, keyed by field. Empty = valid. */
export function withdrawalErrors(
  method: WithdrawalMethod,
  bank: Partial<BankDestination>,
  crypto: Partial<CryptoDestination>,
) {
  const e: Record<string, string> = {};
  if (method === 'BANK') {
    if (!bank.accountHolder?.trim() || bank.accountHolder.trim().length < 2) e.accountHolder = 'Enter the account holder’s name';
    if (!bank.bankName?.trim()) e.bankName = 'Enter the bank’s name';
    const acct = (bank.accountNumber ?? '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9]{6,34}$/.test(acct)) e.accountNumber = 'Enter a valid account number or IBAN (6–34 letters or numbers)';
    if (bank.swift?.trim() && !/^[A-Za-z0-9]{6,11}$/.test(bank.swift.trim())) e.swift = 'SWIFT / BIC codes are 8 or 11 characters';
    if (!bank.country || !WITHDRAWAL_COUNTRIES.includes(bank.country)) e.country = 'Choose the account’s country';
  } else {
    const asset = cryptoAsset(crypto.asset ?? '');
    if (!asset) e.asset = 'Choose a coin';
    const net = asset?.networks.find(n => n.key === crypto.network);
    if (asset && !net) e.network = 'Choose a network';
    const addr = (crypto.address ?? '').trim();
    if (!addr) e.address = 'Enter the receiving address';
    else if (net && !net.pattern.test(addr)) e.address = `This doesn’t look like a ${net.label} address`;
    if ((crypto.memo ?? '').length > 64) e.memo = 'Too long';
  }
  return e;
}

/** One line describing where the money goes, for lists and notifications. */
export function destinationLabel(meta: any) {
  if (!meta) return '';
  if (meta.method === 'CRYPTO') {
    const a: string = meta.address ?? '';
    const short = a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
    return `${meta.asset} on ${cryptoNetwork(meta.asset, meta.network)?.label ?? meta.network} · ${short}`;
  }
  const n: string = (meta.accountNumber ?? '').replace(/\s/g, '');
  return `${meta.bankName} · ${meta.accountHolder} · ••••${n.slice(-4)}`;
}
