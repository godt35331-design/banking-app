import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'crypto';
import { TEST_CARD_PREFIX } from '@kestrel/shared';

/** Card data is encrypted at rest with AES-256-GCM, the way a real issuer would store it. */
const key = () => {
  const hex = process.env.CARD_ENCRYPTION_KEY ?? '';
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('CARD_ENCRYPTION_KEY must be 64 hex characters');
  return Buffer.from(hex, 'hex');
};

export const encrypt = (plain: string): string => {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map(b => b.toString('base64')).join('.');
};

export const decrypt = (payload: string): string => {
  const [iv, tag, data] = payload.split('.').map(s => Buffer.from(s, 'base64'));
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
};

export const hashCardNumber = (n: string) => createHash('sha256').update(n).digest('hex');

const luhnDigit = (partial: string) => {
  let sum = 0;
  for (let i = 0; i < partial.length; i++) {
    let d = Number(partial[partial.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
};

/** 16-digit number in the 4242 42 test range with a valid check digit. Never valid on a real network. */
export const generateCardNumber = () => {
  let p = TEST_CARD_PREFIX;
  while (p.length < 15) p += randomInt(10);
  return p + luhnDigit(p);
};

export const generateCvv = () => String(randomInt(1000)).padStart(3, '0');

export const generateExpiry = () => {
  const now = new Date();
  return { expMonth: 1 + randomInt(12), expYear: now.getFullYear() + 3 + randomInt(2) };
};

export const generateAccountNumber = () => '20' + String(randomInt(100_000_000)).padStart(8, '0');
