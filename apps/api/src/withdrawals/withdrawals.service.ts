import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  WITHDRAWAL_MIN_MINOR, cryptoNetwork, destinationLabel, formatMoney, withdrawalErrors,
  type BankDestination, type CryptoDestination, type Currency, type WithdrawalMethod,
} from '@kestrel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { WITHDRAWAL_EMAIL_SUBJECT, loadWithdrawalEmail, renderWithdrawalEmail } from '../common/withdrawal-email';

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface WithdrawalInput {
  walletId: string;
  amountMinor: number;
  method: WithdrawalMethod;
  bank?: Partial<BankDestination>;
  crypto?: Partial<CryptoDestination>;
  note?: string;
}

/**
 * Withdrawals to the customer's own bank account or crypto wallet.
 * The amount is reserved (taken from the wallet) at once; staff send it and approve the withdrawal
 * in Approvals with the payout reference, or reject it, which returns the money to the wallet.
 */
@Injectable()
export class WithdrawalsService {
  private readonly log = new Logger('Withdrawals');

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  /**
   * The automatic "Update on your withdrawal" email goes out once per customer, however many withdrawals they make.
   * Claiming the marker is a single atomic update, so two quick clicks can't both send it.
   * Returns true when this withdrawal will send the email.
   */
  private async claimReceivedEmail(userId: string) {
    if (!this.mail.configured) return false;
    const template = await loadWithdrawalEmail(this.prisma);
    if (!template.enabled) return false;
    const claimed = await this.prisma.user.updateMany({
      where: { id: userId, OR: [{ withdrawalEmailSentAt: null }, { withdrawalEmailSentAt: { isSet: false } }] },
      data: { withdrawalEmailSentAt: new Date() },
    });
    return claimed.count === 1;
  }

  /** Sends the staff-written email and keeps a record of it on the Mail page. If sending fails, the next withdrawal tries again. */
  private async sendReceivedEmail(userId: string, tx: { id: string; reference: string; amountMinor: number; currency: string; meta: unknown }) {
    const template = await loadWithdrawalEmail(this.prisma);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    if (!user) return;
    const body = renderWithdrawalEmail(template.body, {
      name: user.name,
      amount: formatMoney(tx.amountMinor, tx.currency as Currency),
      reference: tx.reference,
      destination: destinationLabel(tx.meta),
    });
    let status = 'SENT';
    let error: string | null = null;
    try {
      await this.mail.send(user, WITHDRAWAL_EMAIL_SUBJECT, body);
    } catch (e) {
      status = 'FAILED';
      error = (e as Error).message?.slice(0, 500) ?? 'Sending failed';
      this.log.warn(`Withdrawal email to ${user.email} failed: ${error}`);
      await this.prisma.user.update({ where: { id: userId }, data: { withdrawalEmailSentAt: null } }).catch(() => undefined);
    }
    await this.prisma.emailMessage.create({
      data: {
        userId, toEmail: user.email, toName: user.name, category: 'WITHDRAWAL', subject: WITHDRAWAL_EMAIL_SUBJECT, body,
        transactionId: tx.id, status, error, notified: false, sentByName: 'Automatic', templateKey: 'withdrawal_received', refId: tx.id,
      },
    });
  }

  async create(userId: string, b: WithdrawalInput) {
    const method: WithdrawalMethod = b?.method === 'CRYPTO' ? 'CRYPTO' : 'BANK';
    const amount = Math.round(Number(b?.amountMinor));
    if (!Number.isInteger(amount) || amount < WITHDRAWAL_MIN_MINOR) throw new BadRequestException('Enter an amount of at least 1.00');
    if (amount > 100_000_000_00) throw new BadRequestException('That amount is too large');

    const errors = withdrawalErrors(method, b?.bank ?? {}, b?.crypto ?? {});
    if (Object.keys(errors).length) throw new BadRequestException(Object.values(errors)[0]);

    const meta =
      method === 'BANK'
        ? {
            method,
            accountHolder: clip(b.bank!.accountHolder, 120),
            bankName: clip(b.bank!.bankName, 120),
            accountNumber: clip(b.bank!.accountNumber, 40).replace(/\s/g, '').toUpperCase(),
            swift: clip(b.bank!.swift, 11).toUpperCase() || null,
            country: clip(b.bank!.country, 80),
          }
        : {
            method,
            asset: clip(b.crypto!.asset, 10),
            network: clip(b.crypto!.network, 20),
            address: clip(b.crypto!.address, 120),
            memo: clip(b.crypto!.memo, 64) || null,
          };

    // Staff can put a customer's withdrawals on hold, with a note shown on the "Under review" screen.
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { withdrawalHold: true, withdrawalHoldNote: true } });
    const hold = user?.withdrawalHold === true;
    const adminNote = hold ? user?.withdrawalHoldNote?.trim() || null : null;

    const tx = await this.prisma.$transaction(async db => {
      const wallet = await db.wallet.findFirst({ where: { id: b.walletId, userId } });
      if (!wallet) throw new NotFoundException('Choose one of your wallets');
      // Reserve the money only if the balance covers it (atomic, so two requests can't overdraw).
      const debited = await db.wallet.updateMany({ where: { id: wallet.id, balanceMinor: { gte: amount } }, data: { balanceMinor: { decrement: amount } } });
      if (debited.count !== 1) throw new BadRequestException('Not enough money in this wallet');
      return db.transaction.create({
        data: {
          reference: `WDR-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
          userId, walletId: wallet.id,
          kind: method === 'BANK' ? 'WITHDRAWAL_BANK' : 'WITHDRAWAL_CRYPTO',
          direction: 'OUT', amountMinor: amount, feeMinor: 0, currency: wallet.currency,
          status: 'AWAITING_APPROVAL',
          description: method === 'BANK' ? `Withdrawal to ${meta.bankName}` : `Withdrawal to ${meta.asset} wallet`,
          meta: { ...meta, note: clip(b.note, 200) || null, hold, adminNote },
        },
      });
    });

    await this.prisma.notification
      .create({
        data: {
          userId,
          body: hold
            ? `Withdrawal ${tx.reference} of ${formatMoney(amount, tx.currency as Currency)} is under review and processing (${destinationLabel(tx.meta)}).${adminNote ? ` ${adminNote}` : ''}`
            : `Withdrawal ${tx.reference} of ${formatMoney(amount, tx.currency as Currency)} requested (${destinationLabel(tx.meta)}). We'll let you know when it's sent.`,
        },
      })
      .catch(() => undefined);
    // Email in the background (once per customer): the customer's request doesn't wait for the mail server.
    const emailSent = await this.claimReceivedEmail(userId).catch(() => false);
    if (emailSent) {
      void this.sendReceivedEmail(userId, tx).catch(e => this.log.warn(`Withdrawal email not recorded: ${(e as Error).message}`));
    }
    return { ...tx, emailSent };
  }

  list(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId, kind: { in: ['WITHDRAWAL_BANK', 'WITHDRAWAL_CRYPTO'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Networks for a coin, for the form (also validated on submit). */
  networkLabel(asset: string, network: string) {
    return cryptoNetwork(asset, network)?.label ?? network;
  }
}
