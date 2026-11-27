import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { DEFAULT_SETTINGS, destinationLabel, formatMoney, type BankSettings, type Currency } from '@kestrel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AutoMailService } from '../common/auto-mail.service';
import { emailDate } from '../common/auto-emails';
import { withTxRetry } from '../common/tx-retry';

type Actor = { sub: string };
const ref = (prefix: string) => `${prefix}-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/**
 * Everything the bank's staff control. Every change an admin makes is written to the audit log,
 * and customers get a notification when something on their account changes.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly autoMail: AutoMailService) {}

  // ───────────────────────── helpers ─────────────────────────

  private audit(actor: Actor, action: string, target?: string, detail?: Record<string, unknown>) {
    return this.prisma.auditLog
      .create({ data: { actorId: actor.sub, action, target, detail: (detail ?? undefined) as any } })
      .catch(() => undefined);
  }

  private notify(userId: string, body: string) {
    return this.prisma.notification.create({ data: { userId, body } }).catch(() => undefined);
  }

  private async settings(): Promise<BankSettings> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'bank' } });
    return { ...DEFAULT_SETTINGS, ...((s?.value as any) ?? {}) };
  }

  // ───────────────────────── overview ─────────────────────────

  async overview() {
    const today = startOfToday();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const s = await this.settings();
    const rates = s.ratesToUSD as Record<string, number>;

    const [
      customers, active, frozen, locked, newThisWeek, wallets, todayTx,
      transfers, checks, loans, tax, fund, kyc, threads, recentTx, recentUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', status: 'FROZEN' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', status: 'LOCKED' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: weekAgo } } }),
      this.prisma.wallet.findMany({ select: { currency: true, balanceMinor: true } }),
      this.prisma.transaction.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: today } },
        select: { direction: true, amountMinor: true, currency: true },
      }),
      this.prisma.transaction.count({ where: { status: 'AWAITING_APPROVAL' } }),
      this.prisma.transaction.count({ where: { kind: 'DEPOSIT_CHECK', status: 'PENDING' } }),
      this.prisma.loanApplication.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      this.prisma.taxRecovery.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } } }),
      this.prisma.recoveryCase.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', kycStatus: 'PENDING' } }),
      this.supportThreads(),
      this.prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true, status: true },
      }),
    ]);

    const heldByCurrency: Record<string, number> = { USD: 0, EUR: 0, GBP: 0 };
    for (const w of wallets) heldByCurrency[w.currency] = (heldByCurrency[w.currency] ?? 0) + w.balanceMinor;
    const heldUsdMinor = Object.entries(heldByCurrency).reduce((sum, [c, v]) => sum + Math.round(v / (rates[c] ?? 1)), 0);

    let inUsd = 0;
    let outUsd = 0;
    for (const t of todayTx) {
      const usd = Math.round(t.amountMinor / (rates[t.currency] ?? 1));
      if (t.direction === 'IN') inUsd += usd; else outUsd += usd;
    }

    return {
      customers: { total: customers, active, frozen, locked, newThisWeek },
      money: { heldUsdMinor, heldByCurrency, todayInUsdMinor: inUsd, todayOutUsdMinor: outUsd, todayCount: todayTx.length },
      queue: {
        transfers, checks, loans, tax, fund, kyc,
        support: threads.filter(t => t.waiting).length,
      },
      recentTx,
      recentUsers,
    };
  }

  // ───────────────────────── customers ─────────────────────────

  async listUsers(q: { page?: number; search?: string; status?: string; kyc?: string }) {
    const page = Math.max(1, q.page || 1);
    const limit = 20;
    const where: any = { role: 'CUSTOMER' };
    if (q.status && ['ACTIVE', 'FROZEN', 'LOCKED'].includes(q.status)) where.status = q.status;
    if (q.kyc && ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'].includes(q.kyc)) where.kycStatus = q.kyc;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
      ];
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, phone: true, status: true, kycStatus: true, createdAt: true, pinFails: true,
          wallets: { select: { currency: true, balanceMinor: true } },
          _count: { select: { cards: true, transactions: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      include: {
        wallets: { orderBy: { createdAt: 'asc' } },
        cards: {
          where: { status: { not: 'REMOVED' } },
          select: {
            id: true, label: true, last4: true, status: true, kind: true, color: true, holderName: true,
            expMonth: true, expYear: true, monthlyLimitMinor: true, createdAt: true,
          },
        },
        loanApplications: {
          where: { status: { not: 'DRAFT' } },
          orderBy: { createdAt: 'desc' },
          select: { id: true, reference: true, product: true, status: true, amountMinor: true, currency: true, termMonths: true, submittedAt: true, createdAt: true },
        },
        taxRecoveries: { orderBy: { createdAt: 'desc' }, select: { id: true, taxYear: true, country: true, status: true, refundMinor: true, currency: true, createdAt: true } },
        recoveryCases: {
          where: { status: { not: 'DRAFT' } },
          orderBy: { createdAt: 'desc' },
          select: { id: true, reference: true, category: true, status: true, amountMinor: true, currency: true, submittedAt: true, createdAt: true },
        },
        kycDocuments: { select: { type: true, name: true, size: true, mime: true, createdAt: true } },
      },
    });
    if (!user) throw new NotFoundException('Customer not found');
    const [transactions, audit] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.auditLog.findMany({
        where: { target: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { actor: { select: { name: true } } },
      }),
    ]);
    const { passwordHash, pinHash, ...rest } = user;
    return { ...rest, transactions, audit };
  }

  async updateUserStatus(actor: Actor, id: string, status: 'ACTIVE' | 'FROZEN' | 'LOCKED', reason?: string) {
    if (!['ACTIVE', 'FROZEN', 'LOCKED'].includes(status)) throw new BadRequestException('Unknown status');
    const user = await this.findCustomer(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status, ...(status === 'ACTIVE' ? { pinFails: 0 } : {}) },
      select: { id: true, status: true },
    });
    await this.audit(actor, `customer.${status.toLowerCase()}`, id, { from: user.status, reason });
    const msg: Record<string, string> = {
      ACTIVE: 'Your account is active again.',
      FROZEN: 'Your account has been frozen. You can still log in and contact support, but payments are paused.',
      LOCKED: 'Your account has been locked. Please contact the bank.',
    };
    await this.notify(id, msg[status] + (reason ? ` Reason: ${reason}` : ''));
    if (status === 'FROZEN' && user.status !== 'FROZEN') this.autoMail.queue('account_frozen', id, { reason });
    if (status === 'LOCKED' && user.status !== 'LOCKED') this.autoMail.queue('account_locked', id, { reason });
    if (status === 'ACTIVE' && user.status !== 'ACTIVE') this.autoMail.queue('account_reactivated', id, { reason });
    return updated;
  }

  /**
   * Withdrawal hold: the customer can still open the Withdraw screen and fill it in, but their
   * request is shown as "Under review and processing" with this note. Staff still confirm it in Approvals.
   * The note is also copied onto any of their withdrawals that are waiting, so the customer sees the latest text.
   */
  async setWithdrawalHold(actor: Actor, id: string, hold: boolean, note?: string) {
    await this.findCustomer(id);
    const cleanNote = note?.trim().slice(0, 500) || null;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { withdrawalHold: hold, withdrawalHoldNote: cleanNote },
      select: { id: true, withdrawalHold: true, withdrawalHoldNote: true },
    });
    if (hold) {
      const waiting = await this.prisma.transaction.findMany({
        where: { userId: id, status: 'AWAITING_APPROVAL', kind: { in: ['WITHDRAWAL_BANK', 'WITHDRAWAL_CRYPTO'] } },
        select: { id: true, meta: true },
      });
      for (const t of waiting) {
        await this.prisma.transaction.update({ where: { id: t.id }, data: { meta: { ...((t.meta as any) ?? {}), hold: true, adminNote: cleanNote } } });
      }
    }
    await this.audit(actor, hold ? 'customer.withdrawal_hold' : 'customer.withdrawal_release', id, { note: cleanNote ?? undefined });
    return updated;
  }

  /** Change the note the customer sees on one waiting withdrawal. */
  async setWithdrawalNote(actor: Actor, txId: string, note: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx || !['WITHDRAWAL_BANK', 'WITHDRAWAL_CRYPTO'].includes(tx.kind) || tx.status !== 'AWAITING_APPROVAL') {
      throw new NotFoundException('Withdrawal not found or already decided');
    }
    const cleanNote = note?.trim().slice(0, 500) || null;
    await this.prisma.transaction.update({ where: { id: txId }, data: { meta: { ...((tx.meta as any) ?? {}), adminNote: cleanNote } } });
    await this.audit(actor, 'withdrawal.note', tx.userId, { transactionId: txId, reference: tx.reference, note: cleanNote ?? undefined });
    if (cleanNote) await this.notify(tx.userId, `Update on withdrawal ${tx.reference}: ${cleanNote}`);
    return { ok: true };
  }

  async updateKyc(actor: Actor, id: string, kycStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'NOT_SUBMITTED', note?: string) {
    if (!['APPROVED', 'REJECTED', 'PENDING', 'NOT_SUBMITTED'].includes(kycStatus)) throw new BadRequestException('Unknown status');
    if (kycStatus === 'REJECTED' && !note?.trim()) throw new BadRequestException('Tell the customer why, so they can send the right documents');
    await this.findCustomer(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { kycStatus, kycNote: kycStatus === 'REJECTED' ? note!.trim().slice(0, 500) : null },
      select: { id: true, kycStatus: true },
    });
    await this.audit(actor, 'customer.kyc', id, { kycStatus, reason: note?.trim() || undefined });
    if (kycStatus === 'APPROVED') {
      await this.notify(id, 'Your identity has been verified. Thank you!');
      this.autoMail.queue('kyc_approved', id);
    }
    if (kycStatus === 'REJECTED') {
      await this.notify(id, `We couldn't verify your identity: ${note!.trim()} Please upload new documents in Settings.`);
      this.autoMail.queue('kyc_rejected', id, { reason: note!.trim() });
    }
    return updated;
  }

  async updateProfile(actor: Actor, id: string, data: { name?: string; phone?: string; email?: string }) {
    const before = await this.findCustomer(id);
    const clean: any = {};
    if (data.name?.trim()) clean.name = data.name.trim().slice(0, 120);
    if (data.phone !== undefined) clean.phone = data.phone.trim().slice(0, 32) || null;
    if (data.email?.trim()) {
      const email = data.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email');
      const taken = await this.prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (taken) throw new ConflictException('That email is already used by another account');
      clean.email = email;
    }
    const u = await this.prisma.user.update({ where: { id }, data: clean, select: { id: true, name: true, email: true, phone: true } });
    await this.audit(actor, 'customer.profile', id, { fields: Object.keys(clean) });
    if (clean.email && clean.email !== before.email) {
      const fields = { oldEmail: before.email, newEmail: clean.email, date: emailDate() };
      // Tell both addresses, so a hijacked account doesn't go unnoticed.
      this.autoMail.queue('email_changed', id, fields, { to: { email: before.email, name: before.name } });
      this.autoMail.queue('email_changed', id, fields);
    }
    return u;
  }

  async resetCredential(actor: Actor, id: string, kind: 'password' | 'pin', value: string) {
    await this.findCustomer(id);
    if (kind === 'password' && (value?.length ?? 0) < 8) throw new BadRequestException('Password must be at least 8 characters');
    if (kind === 'pin' && !/^\d{4}$/.test(value ?? '')) throw new BadRequestException('PIN must be exactly 4 digits');
    const hash = await argon2.hash(value);
    await this.prisma.user.update({
      where: { id },
      data: kind === 'password' ? { passwordHash: hash } : { pinHash: hash, pinLength: value.length, pinFails: 0 },
    });
    await this.audit(actor, `customer.reset_${kind}`, id);
    await this.notify(id, kind === 'password' ? 'Your password was reset by the bank.' : 'Your PIN was reset by the bank.');
    this.autoMail.queue(kind === 'password' ? 'password_changed' : 'pin_changed', id, { by: 'by our staff', date: emailDate() });
    return { ok: true };
  }

  /** Manual credit or debit on a wallet, always with a reason. */
  async adjustWallet(actor: Actor, userId: string, dto: { walletId: string; direction: 'IN' | 'OUT'; amountMinor: number; reason: string }) {
    if (!['IN', 'OUT'].includes(dto.direction)) throw new BadRequestException('Choose credit or debit');
    if (!Number.isInteger(dto.amountMinor) || dto.amountMinor < 1 || dto.amountMinor > 100_000_000_00) throw new BadRequestException('Enter a valid amount');
    if (!dto.reason?.trim()) throw new BadRequestException('A reason is required');
    const wallet = await this.prisma.wallet.findFirst({ where: { id: dto.walletId, userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const tx = await withTxRetry(this.prisma, async db => {
      if (dto.direction === 'OUT') {
        const ok = await db.wallet.updateMany({
          where: { id: wallet.id, balanceMinor: { gte: dto.amountMinor } },
          data: { balanceMinor: { decrement: dto.amountMinor } },
        });
        if (ok.count !== 1) throw new BadRequestException('The wallet balance is too low for this debit');
      } else {
        await db.wallet.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: dto.amountMinor } } });
      }
      return db.transaction.create({
        data: {
          reference: ref('ADJ'),
          userId,
          walletId: wallet.id,
          kind: 'ADJUSTMENT',
          direction: dto.direction,
          amountMinor: dto.amountMinor,
          currency: wallet.currency,
          status: 'COMPLETED',
          description: dto.reason.trim().slice(0, 140),
          completedAt: new Date(),
          meta: { by: actor.sub },
        },
      });
    });
    await this.audit(actor, `wallet.${dto.direction === 'IN' ? 'credit' : 'debit'}`, userId, {
      walletId: wallet.id, amountMinor: dto.amountMinor, currency: wallet.currency, reason: dto.reason,
    });
    await this.notify(userId, `${dto.direction === 'IN' ? 'Credit' : 'Debit'} of ${formatMoney(dto.amountMinor, wallet.currency as Currency)} on your ${wallet.currency} wallet: ${dto.reason.trim()}`);
    this.autoMail.queue(dto.direction === 'IN' ? 'wallet_credited' : 'wallet_debited', userId, {
      amount: formatMoney(dto.amountMinor, wallet.currency as Currency), currency: wallet.currency, reason: dto.reason.trim(), reference: tx.reference,
    });
    return tx;
  }

  private async findCustomer(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, role: 'CUSTOMER' } });
    if (!user) throw new NotFoundException('Customer not found');
    return user;
  }

  // ───────────────────────── approvals ─────────────────────────

  async approvals() {
    const [transfers, checks] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { status: 'AWAITING_APPROVAL' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: { kind: 'DEPOSIT_CHECK', status: 'PENDING' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { transfers, checks };
  }

  /**
   * Large transfers: the money (amount + fee) was already taken from the wallet when the
   * customer sent it. Approving completes it; rejecting gives the money back.
   */
  async decideTransfer(actor: Actor, id: string, approve: boolean, reason?: string, payoutReference?: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.status !== 'AWAITING_APPROVAL') throw new NotFoundException('Transfer not found or already decided');
    const withdrawal = tx.kind === 'WITHDRAWAL_BANK' || tx.kind === 'WITHDRAWAL_CRYPTO';
    const payoutRef = payoutReference?.trim().slice(0, 140) || null;
    if (withdrawal && approve && !payoutRef) {
      throw new BadRequestException(tx.kind === 'WITHDRAWAL_CRYPTO' ? 'Enter the transaction hash (TXID) of the crypto you sent' : 'Enter the bank payment reference');
    }

    await withTxRetry(this.prisma, async db => {
      const marked = await db.transaction.updateMany({
        where: { id, status: 'AWAITING_APPROVAL' },
        data: approve
          ? { status: 'COMPLETED', completedAt: new Date(), ...(payoutRef ? { meta: { ...((tx.meta as any) ?? {}), payoutReference: payoutRef } } : {}) }
          : { status: 'REJECTED', reason: reason?.trim() || 'Rejected by the bank' },
      });
      if (marked.count !== 1) throw new ConflictException('This transfer was already decided');
      if (!approve) {
        await db.wallet.update({ where: { id: tx.walletId }, data: { balanceMinor: { increment: tx.amountMinor + tx.feeMinor } } });
      }
    });

    const what = withdrawal ? 'withdrawal' : 'transfer';
    await this.audit(actor, `${what}.${approve ? 'approve' : 'reject'}`, tx.userId, { transactionId: id, reference: tx.reference, reason, payoutReference: payoutRef ?? undefined });
    await this.notify(
      tx.userId,
      approve
        ? `Your ${what} ${tx.reference} of ${formatMoney(tx.amountMinor, tx.currency as Currency)} has been ${withdrawal ? `sent (${destinationLabel(tx.meta)}). Reference: ${payoutRef}` : 'approved and sent'}.`
        : `Your ${what} ${tx.reference} was not approved and ${formatMoney(tx.amountMinor + tx.feeMinor, tx.currency as Currency)} has been returned to your wallet.${reason ? ` Reason: ${reason}` : ''}`,
    );
    const m = (tx.meta as any) ?? {};
    const amount = formatMoney(tx.amountMinor, tx.currency as Currency);
    const reasonText = reason?.trim() || null;
    if (withdrawal) {
      const destination = destinationLabel(tx.meta);
      this.autoMail.queue(approve ? 'withdrawal_sent' : 'withdrawal_returned', tx.userId,
        { amount, destination, reference: tx.reference, payoutReference: payoutRef, reason: reasonText }, { refId: tx.id });
    } else {
      this.autoMail.queue(approve ? 'transfer_approved' : 'transfer_rejected', tx.userId, {
        amount: approve ? amount : formatMoney(tx.amountMinor + tx.feeMinor, tx.currency as Currency),
        recipient: m.recipientName ?? 'your recipient', reference: tx.reference, reason: reasonText,
      }, { refId: tx.id });
    }
    return { ok: true };
  }

  /** Check deposits: clearing credits the wallet; bouncing marks it failed. */
  async decideCheck(actor: Actor, id: string, clear: boolean, reason?: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.kind !== 'DEPOSIT_CHECK' || tx.status !== 'PENDING') throw new NotFoundException('Check deposit not found or already decided');

    await withTxRetry(this.prisma, async db => {
      const marked = await db.transaction.updateMany({
        where: { id, status: 'PENDING' },
        data: clear
          ? { status: 'COMPLETED', completedAt: new Date() }
          : { status: 'FAILED', reason: reason?.trim() || 'Check could not be cleared' },
      });
      if (marked.count !== 1) throw new ConflictException('This check was already decided');
      if (clear) await db.wallet.update({ where: { id: tx.walletId }, data: { balanceMinor: { increment: tx.amountMinor } } });
    });

    await this.audit(actor, clear ? 'check.clear' : 'check.bounce', tx.userId, { transactionId: id, reference: tx.reference, reason });
    await this.notify(
      tx.userId,
      clear
        ? `Your check deposit of ${formatMoney(tx.amountMinor, tx.currency as Currency)} has cleared.`
        : `Your check deposit of ${formatMoney(tx.amountMinor, tx.currency as Currency)} could not be cleared.${reason ? ` Reason: ${reason}` : ''}`,
    );
    this.autoMail.queue(clear ? 'check_cleared' : 'check_bounced', tx.userId, {
      amount: formatMoney(tx.amountMinor, tx.currency as Currency), reference: tx.reference, reason: reason?.trim() || null,
    }, { refId: tx.id });
    return { ok: true };
  }

  // ───────────────────────── transactions ─────────────────────────

  async transactions(q: { page?: number; search?: string; kind?: string; status?: string; userId?: string }) {
    const page = Math.max(1, q.page || 1);
    const limit = 30;
    const where: any = {};
    if (q.kind) where.kind = q.kind;
    if (q.status) where.status = q.status;
    if (q.userId) where.userId = q.userId;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { reference: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { user: { is: { OR: [{ name: { contains: s, mode: 'insensitive' } }, { email: { contains: s, mode: 'insensitive' } }] } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  /** Reverses a completed transaction with an opposite adjustment (the original stays for the record). */
  async reverseTransaction(actor: Actor, id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('A reason is required');
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'COMPLETED') throw new BadRequestException('Only completed transactions can be reversed');
    if (tx.reversedById) throw new ConflictException('This transaction was already reversed');
    if (tx.kind === 'SWAP') throw new BadRequestException('Swaps have two sides. Use manual credits/debits instead.');

    const back = tx.direction === 'OUT' ? tx.amountMinor + tx.feeMinor : tx.amountMinor;
    const reversal = await withTxRetry(this.prisma, async db => {
      if (tx.direction === 'IN') {
        const ok = await db.wallet.updateMany({
          where: { id: tx.walletId, balanceMinor: { gte: back } },
          data: { balanceMinor: { decrement: back } },
        });
        if (ok.count !== 1) throw new BadRequestException("The customer's balance is too low to reverse this");
      } else {
        await db.wallet.update({ where: { id: tx.walletId }, data: { balanceMinor: { increment: back } } });
      }
      const r = await db.transaction.create({
        data: {
          reference: ref('REV'),
          userId: tx.userId,
          walletId: tx.walletId,
          kind: 'ADJUSTMENT',
          direction: tx.direction === 'OUT' ? 'IN' : 'OUT',
          amountMinor: back,
          currency: tx.currency,
          status: 'COMPLETED',
          description: `Reversal of ${tx.reference}: ${reason.trim()}`.slice(0, 160),
          completedAt: new Date(),
          meta: { reversalOf: tx.id, by: actor.sub },
        },
      });
      const marked = await db.transaction.updateMany({ where: { id: tx.id, reversedById: null }, data: { reversedById: r.id } });
      if (marked.count !== 1) throw new ConflictException('This transaction was already reversed');
      return r;
    });

    await this.audit(actor, 'transaction.reverse', tx.userId, { transactionId: id, reference: tx.reference, reason });
    await this.notify(tx.userId, `Transaction ${tx.reference} was reversed by the bank: ${reason.trim()}`);
    this.autoMail.queue('transaction_reversed', tx.userId, {
      reference: tx.reference, amount: formatMoney(back, tx.currency as Currency),
      direction: tx.direction === 'OUT' ? 'returned to' : 'taken from', reason: reason.trim(),
    }, { refId: tx.id });
    return reversal;
  }

  // ───────────────────────── cards ─────────────────────────

  async cards(q: { search?: string; status?: string }) {
    const where: any = { status: { not: 'REMOVED' } };
    if (q.status && ['ACTIVE', 'FROZEN'].includes(q.status)) where.status = q.status;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { last4: { contains: s } },
        { label: { contains: s, mode: 'insensitive' } },
        { holderName: { contains: s, mode: 'insensitive' } },
        { user: { is: { OR: [{ name: { contains: s, mode: 'insensitive' } }, { email: { contains: s, mode: 'insensitive' } }] } } },
      ];
    }
    return this.prisma.card.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, label: true, last4: true, status: true, kind: true, color: true, holderName: true,
        expMonth: true, expYear: true, monthlyLimitMinor: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateCard(actor: Actor, id: string, dto: { status?: 'ACTIVE' | 'FROZEN' | 'REMOVED'; monthlyLimitMinor?: number | null }) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card || card.status === 'REMOVED') throw new NotFoundException('Card not found');
    const data: any = {};
    if (dto.status) {
      if (!['ACTIVE', 'FROZEN', 'REMOVED'].includes(dto.status)) throw new BadRequestException('Unknown status');
      data.status = dto.status;
    }
    if (dto.monthlyLimitMinor !== undefined) {
      if (dto.monthlyLimitMinor !== null && (!Number.isInteger(dto.monthlyLimitMinor) || dto.monthlyLimitMinor < 0)) {
        throw new BadRequestException('Enter a valid limit');
      }
      data.monthlyLimitMinor = dto.monthlyLimitMinor;
    }
    const updated = await this.prisma.card.update({ where: { id }, data, select: { id: true, status: true, monthlyLimitMinor: true } });
    await this.audit(actor, 'card.update', card.userId, { cardId: id, last4: card.last4, ...data });
    if (dto.status) {
      const word = { ACTIVE: 'reactivated', FROZEN: 'frozen', REMOVED: 'blocked' }[dto.status];
      await this.notify(card.userId, `Your card ending ${card.last4} has been ${word} by the bank.`);
      if (dto.status !== card.status) this.autoMail.queue('card_status', card.userId, { last4: card.last4, action: word });
    }
    return updated;
  }

  // ───────────────────────── support inbox ─────────────────────────

  async supportThreads() {
    const latest = await this.prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    // A thread is "waiting" if the customer wrote after the last staff reply.
    const lastAdmin = await this.prisma.supportMessage.findMany({
      where: { sender: 'ADMIN', userId: { in: latest.map(m => m.userId) } },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      select: { userId: true, createdAt: true },
    });
    const lastCustomer = await this.prisma.supportMessage.findMany({
      where: { sender: 'CUSTOMER', userId: { in: latest.map(m => m.userId) } },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      select: { userId: true, createdAt: true },
    });
    return latest.map(m => {
      const a = lastAdmin.find(x => x.userId === m.userId)?.createdAt;
      const c = lastCustomer.find(x => x.userId === m.userId)?.createdAt;
      return { userId: m.userId, user: m.user, lastMessage: m.body, lastSender: m.sender, lastAt: m.createdAt, waiting: !!c && (!a || c > a) };
    });
  }

  supportMessages(userId: string) {
    return this.prisma.supportMessage.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async supportReply(actor: Actor, userId: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Write a message');
    await this.findCustomer(userId);
    const msg = await this.prisma.supportMessage.create({ data: { userId, sender: 'ADMIN', body: body.trim().slice(0, 2000) } });
    await this.audit(actor, 'support.reply', userId);
    const text = msg.body.length > 600 ? `${msg.body.slice(0, 600)}…` : msg.body;
    this.autoMail.queue('support_reply', userId, { message: text }, { minGapMinutes: 30 });
    return msg;
  }

  // ───────────────────────── bank settings ─────────────────────────

  getSettings() {
    return this.settings();
  }

  async updateSettings(actor: Actor, next: BankSettings) {
    const errors: string[] = [];
    const num = (v: unknown, min: number, max: number, label: string) => {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) errors.push(`${label} must be between ${min} and ${max}`);
    };
    for (const c of ['USD', 'EUR', 'GBP'] as const) num(next?.ratesToUSD?.[c], 0.0001, 10_000, `${c} rate`);
    if (next?.ratesToUSD?.USD !== 1) errors.push('USD rate must stay 1');
    num(next?.swapMarginPct, 0, 20, 'Swap margin');
    num(next?.approvalThresholdMinorUSD, 0, 1_000_000_000, 'Approval threshold');
    num(next?.maxCardsPerCustomer, 1, 50, 'Max cards');
    num(next?.pinAttempts, 1, 20, 'PIN attempts');
    num(next?.idleMinutes, 1, 240, 'Idle timeout');
    for (const k of Object.keys(DEFAULT_SETTINGS.fees)) {
      num((next?.fees as any)?.[k]?.pct, 0, 50, `${k} fee %`);
      num((next?.fees as any)?.[k]?.minMinor, 0, 100_000_000, `${k} minimum fee`);
      num((next?.limits as any)?.[k]?.perTxMinor, 0, 10_000_000_000, `${k} per-transaction limit`);
      num((next?.limits as any)?.[k]?.perDayMinor, 0, 10_000_000_000, `${k} daily limit`);
    }
    if (errors.length) throw new BadRequestException(errors.join('. '));

    const clean: BankSettings = {
      ratesToUSD: next.ratesToUSD,
      swapMarginPct: next.swapMarginPct,
      fees: next.fees,
      limits: next.limits,
      approvalThresholdMinorUSD: Math.round(next.approvalThresholdMinorUSD),
      maxCardsPerCustomer: Math.round(next.maxCardsPerCustomer),
      pinAttempts: Math.round(next.pinAttempts),
      idleMinutes: Math.round(next.idleMinutes),
    };
    const before = await this.settings();
    await this.prisma.setting.upsert({
      where: { key: 'bank' },
      create: { key: 'bank', value: clean as any },
      update: { value: clean as any },
    });
    await this.audit(actor, 'settings.update', 'bank', { before, after: clean });
    return clean;
  }

  // ───────────────────────── activity log ─────────────────────────

  async auditLog(page = 1) {
    const limit = 40;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(1, page) - 1) * limit,
        take: limit,
        include: { actor: { select: { name: true, email: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    // Attach customer names for targets that are user ids.
    const ids = [...new Set(items.map(i => i.target).filter((t): t is string => !!t && /^[0-9a-f]{24}$/.test(t)))];
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    return {
      items: items.map(i => ({ ...i, targetName: users.find(u => u.id === i.target)?.name ?? null })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
