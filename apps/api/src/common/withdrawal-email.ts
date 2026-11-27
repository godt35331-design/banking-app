import type { PrismaService } from '../prisma/prisma.service';

/** The automatic email sent when a customer submits a withdrawal. Written by staff on the admin Mail page. */
export const WITHDRAWAL_EMAIL_KEY = 'withdrawal_email';
export const WITHDRAWAL_EMAIL_SUBJECT = 'Update on your withdrawal';

export type WithdrawalEmailTemplate = { enabled: boolean; body: string };

export const DEFAULT_WITHDRAWAL_EMAIL: WithdrawalEmailTemplate = {
  enabled: true,
  body:
    'We have received your withdrawal request of {amount} (reference {reference}).\n\n' +
    'It is now under review. We will let you know as soon as it has been processed.',
};

/** Placeholders staff can use in the message. */
export const WITHDRAWAL_EMAIL_FIELDS = ['{name}', '{amount}', '{reference}', '{destination}'] as const;

export async function loadWithdrawalEmail(prisma: PrismaService): Promise<WithdrawalEmailTemplate> {
  const s = await prisma.setting.findUnique({ where: { key: WITHDRAWAL_EMAIL_KEY } });
  const v = (s?.value as Partial<WithdrawalEmailTemplate> | null) ?? {};
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : DEFAULT_WITHDRAWAL_EMAIL.enabled,
    body: typeof v.body === 'string' && v.body.trim() ? v.body : DEFAULT_WITHDRAWAL_EMAIL.body,
  };
}

/** "Dear {name}," is always the first line; the staff-written message follows. */
export function renderWithdrawalEmail(
  body: string,
  data: { name: string; amount: string; reference: string; destination: string },
) {
  const filled = body
    .replace(/\{name\}/g, data.name)
    .replace(/\{amount\}/g, data.amount)
    .replace(/\{reference\}/g, data.reference)
    .replace(/\{destination\}/g, data.destination)
    .trim();
  return `Dear ${data.name},\n\n${filled}`;
}
