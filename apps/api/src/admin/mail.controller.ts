import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  WITHDRAWAL_EMAIL_FIELDS, WITHDRAWAL_EMAIL_KEY, WITHDRAWAL_EMAIL_SUBJECT, loadWithdrawalEmail,
} from '../common/withdrawal-email';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { AutoMailService } from '../common/auto-mail.service';
import { AUTO_EMAIL_GROUPS } from '../common/auto-emails';

type Actor = { sub: string };
const CATEGORIES = ['WITHDRAWAL', 'ACCOUNT', 'IDENTITY', 'GENERAL'];

/** Staff emailing customers. Every email is stored (with its send status) and written to the activity log. */
@Controller('admin/mail')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminMailController {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly autoMail: AutoMailService) {}

  @Get('status')
  status() {
    return { configured: this.mail.configured, from: this.mail.configured ? this.mail.from : null };
  }

  /** The automatic "Update on your withdrawal" email, sent when a customer submits a withdrawal. */
  @Get('auto/withdrawal')
  async getWithdrawalTemplate() {
    return { subject: WITHDRAWAL_EMAIL_SUBJECT, fields: WITHDRAWAL_EMAIL_FIELDS, ...(await loadWithdrawalEmail(this.prisma)) };
  }

  @Put('auto/withdrawal')
  async saveWithdrawalTemplate(@CurrentUser() a: Actor, @Body() b: { enabled?: boolean; body?: string }) {
    const body = (b?.body ?? '').trim().slice(0, 10_000);
    if (!body) throw new BadRequestException('Write the message');
    const value = { enabled: b?.enabled !== false, body };
    await this.prisma.setting.upsert({
      where: { key: WITHDRAWAL_EMAIL_KEY },
      create: { key: WITHDRAWAL_EMAIL_KEY, value },
      update: { value },
    });
    await this.prisma.auditLog
      .create({ data: { actorId: a.sub, action: 'mail.template', target: 'withdrawal', detail: { enabled: value.enabled } } })
      .catch(() => undefined);
    return { subject: WITHDRAWAL_EMAIL_SUBJECT, fields: WITHDRAWAL_EMAIL_FIELDS, ...value };
  }

  /** All other automatic emails (security, money, welcome, services): on/off and wording. */
  @Get('auto')
  async autoList() {
    return { groups: AUTO_EMAIL_GROUPS, emails: await this.autoMail.list() };
  }

  @Put('auto/:key')
  async autoUpdate(
    @CurrentUser() a: Actor,
    @Param('key') key: string,
    @Body() b: { enabled?: boolean; subject?: string; body?: string; reset?: boolean },
  ) {
    if (typeof b?.subject === 'string' && !b.subject.trim()) throw new BadRequestException('Add a subject');
    if (typeof b?.body === 'string' && !b.body.trim()) throw new BadRequestException('Write the message');
    const updated = await this.autoMail.update(key, b ?? {});
    if (!updated) throw new NotFoundException('Unknown email');
    await this.prisma.auditLog
      .create({ data: { actorId: a.sub, action: 'mail.template', target: key, detail: { enabled: updated.enabled, reset: b?.reset || undefined } } })
      .catch(() => undefined);
    return updated;
  }

  @Get()
  async list(@Query('userId') userId?: string, @Query('page') page?: string) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const where = userId ? { userId } : {};
    const [items, total] = await Promise.all([
      this.prisma.emailMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * 30, take: 30 }),
      this.prisma.emailMessage.count({ where }),
    ]);
    return { items, total, page: p, pages: Math.max(1, Math.ceil(total / 30)) };
  }

  /** Customer details and recent withdrawals, used to fill in the templates. */
  @Get('context/:userId')
  async context(@Param('userId') userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: 'CUSTOMER' },
      select: { id: true, name: true, email: true, status: true, kycStatus: true, kycNote: true, withdrawalHold: true, withdrawalHoldNote: true },
    });
    if (!user) throw new NotFoundException('Customer not found');
    const withdrawals = await this.prisma.transaction.findMany({
      where: { userId, kind: { in: ['WITHDRAWAL_BANK', 'WITHDRAWAL_CRYPTO'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, reference: true, kind: true, status: true, amountMinor: true, currency: true, reason: true, meta: true, createdAt: true, completedAt: true },
    });
    return { user, withdrawals };
  }

  @Post()
  async send(
    @CurrentUser() a: Actor,
    @Body() b: { userId: string; subject: string; body: string; category?: string; transactionId?: string; notify?: boolean },
  ) {
    const subject = b?.subject?.trim().slice(0, 200);
    const body = b?.body?.trim().slice(0, 10_000);
    if (!subject) throw new BadRequestException('Add a subject');
    if (!body) throw new BadRequestException('Write the message');
    const user = await this.prisma.user.findFirst({ where: { id: b.userId, role: 'CUSTOMER' }, select: { id: true, name: true, email: true } });
    if (!user) throw new NotFoundException('Choose a customer');
    const category = CATEGORIES.includes(b.category ?? '') ? b.category! : 'GENERAL';
    let transactionId: string | null = null;
    if (b.transactionId) {
      const tx = await this.prisma.transaction.findFirst({ where: { id: b.transactionId, userId: user.id }, select: { id: true } });
      transactionId = tx?.id ?? null;
    }
    const staff = await this.prisma.user.findUnique({ where: { id: a.sub }, select: { name: true } });

    let status = 'NOT_CONFIGURED';
    let error: string | null = 'Email is not set up yet (add SMTP settings to apps/api/.env)';
    if (this.mail.configured) {
      try {
        await this.mail.send(user, subject, body);
        status = 'SENT';
        error = null;
      } catch (e) {
        status = 'FAILED';
        error = (e as Error).message?.slice(0, 500) ?? 'Sending failed';
      }
    }

    const notify = b.notify !== false;
    if (notify) {
      await this.prisma.notification.create({ data: { userId: user.id, body: `${subject}: ${body.slice(0, 400)}${body.length > 400 ? '…' : ''}` } }).catch(() => undefined);
    }
    const saved = await this.prisma.emailMessage.create({
      data: {
        userId: user.id, toEmail: user.email, toName: user.name, category, subject, body, transactionId,
        status, error, notified: notify, sentById: a.sub, sentByName: staff?.name ?? null,
      },
    });
    await this.prisma.auditLog
      .create({ data: { actorId: a.sub, action: `mail.${status.toLowerCase()}`, target: user.id, detail: { subject, category, emailId: saved.id } } })
      .catch(() => undefined);
    return saved;
  }
}
