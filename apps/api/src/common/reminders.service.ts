import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { formatMoney, type Currency } from '@kestrel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AutoMailService } from './auto-mail.service';
import { emailDate } from './auto-emails';

/**
 * Loan repayment reminders. Runs every hour; each reminder is only ever sent once per instalment,
 * so it doesn't matter if the server was off for a while.
 */
@Injectable()
export class RemindersService {
  private readonly log = new Logger('Reminders');
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly autoMail: AutoMailService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async loanRepayments() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const inThreeDays = new Date(now.getTime() + 3 * 86_400_000);
      const yesterday = new Date(now.getTime() - 86_400_000);

      const [dueSoon, overdue] = await Promise.all([
        this.prisma.loanRepayment.findMany({
          where: { paidAt: null, dueDate: { gte: now, lte: inThreeDays }, application: { status: 'DISBURSED' } },
          include: { application: { select: { reference: true } } },
          take: 500,
        }),
        this.prisma.loanRepayment.findMany({
          where: { paidAt: null, dueDate: { lt: yesterday }, application: { status: 'DISBURSED' } },
          include: { application: { select: { reference: true } } },
          take: 500,
        }),
      ]);

      const data = (r: (typeof dueSoon)[number]) => ({
        amount: formatMoney(r.amountMinor, r.currency as Currency),
        dueDate: emailDate(r.dueDate, false),
        instalment: String(r.number),
        reference: r.application.reference ?? '',
      });
      for (const r of dueSoon) await this.autoMail.send('loan_repayment_due', r.userId, data(r), { refId: r.id, once: true });
      for (const r of overdue) await this.autoMail.send('loan_repayment_overdue', r.userId, data(r), { refId: r.id, once: true });
    } catch (e) {
      this.log.warn(`Loan reminders failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
