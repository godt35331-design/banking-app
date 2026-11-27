import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { AUTO_EMAILS, autoEmailDef, fillTemplate, type AutoEmailDef } from './auto-emails';

/** Each email's on/off and wording is stored in the settings collection as "auto_email:<key>". */
export const AUTO_EMAILS_SETTING_KEY = 'auto_email:';
type Saved = Record<string, { enabled?: boolean; subject?: string; body?: string }>;

export interface AutoEmailConfig extends AutoEmailDef {
  enabled: boolean;
  custom: boolean; // wording edited by staff
  defaultSubject: string;
  defaultBody: string;
}

export interface SendOptions {
  /** Send to this address instead of the customer's current one (e.g. the old address after an email change). */
  to?: { email: string; name: string };
  /** Something this email is about (repayment id, transaction id…); with `once`, it is only ever sent once for it. */
  refId?: string;
  once?: boolean;
  /** Don't send if the same email went to this customer within this many minutes. */
  minGapMinutes?: number;
}

/**
 * Sends the automatic emails. Calls never throw and never slow down the action that triggered them:
 * use `queue()` from services.
 */
@Injectable()
export class AutoMailService {
  private readonly log = new Logger('AutoMail');

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  async list(): Promise<AutoEmailConfig[]> {
    const saved = await this.saved();
    return AUTO_EMAILS.map(d => this.merge(d, saved[d.key]));
  }

  async get(key: string) {
    const d = autoEmailDef(key);
    if (!d) return null;
    return this.merge(d, (await this.saved())[key]);
  }

  /** Staff change: on/off, wording, or reset to the default wording. */
  async update(key: string, change: { enabled?: boolean; subject?: string; body?: string; reset?: boolean }) {
    const d = autoEmailDef(key);
    if (!d) return null;
    const cur = { ...((await this.saved())[key] ?? {}) };
    if (typeof change.enabled === 'boolean') cur.enabled = change.enabled;
    if (change.reset) { delete cur.subject; delete cur.body; }
    if (typeof change.subject === 'string') {
      const s = change.subject.trim().slice(0, 200);
      if (s && s !== d.subject) cur.subject = s; else delete cur.subject;
    }
    if (typeof change.body === 'string') {
      const b = change.body.trim().slice(0, 10_000);
      if (b && b !== d.body) cur.body = b; else delete cur.body;
    }
    // One settings row per email, so changing several at once can't overwrite each other.
    const rowKey = AUTO_EMAILS_SETTING_KEY + key;
    await this.prisma.setting.upsert({
      where: { key: rowKey },
      create: { key: rowKey, value: cur as any },
      update: { value: cur as any },
    });
    return this.merge(d, cur);
  }

  /** Fire-and-forget: the caller doesn't wait for the mail server. */
  queue(key: string, userId: string, data: Record<string, string | null | undefined> = {}, opts: SendOptions = {}) {
    void this.send(key, userId, data, opts).catch(e => this.log.warn(`${key}: ${(e as Error).message}`));
  }

  async send(key: string, userId: string, data: Record<string, string | null | undefined> = {}, opts: SendOptions = {}) {
    if (!this.mail.configured) return false;
    const cfg = await this.get(key);
    if (!cfg?.enabled) return false;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
    if (!user || user.role !== 'CUSTOMER') return false;
    const to = opts.to ?? { email: user.email, name: user.name };

    if (opts.once && opts.refId) {
      const already = await this.prisma.emailMessage.findFirst({ where: { templateKey: key, refId: opts.refId, toEmail: to.email, status: 'SENT' }, select: { id: true } });
      if (already) return false;
    }
    if (opts.minGapMinutes) {
      const since = new Date(Date.now() - opts.minGapMinutes * 60_000);
      const recent = await this.prisma.emailMessage.findFirst({ where: { templateKey: key, userId, status: 'SENT', createdAt: { gte: since } }, select: { id: true } });
      if (recent) return false;
    }

    const fields = { name: user.name, ...data };
    const subject = fillTemplate(cfg.subject, fields).replace(/\s+/g, ' ').slice(0, 200);
    const body = `Dear ${user.name},\n\n${fillTemplate(cfg.body, fields)}`;

    let status = 'SENT';
    let error: string | null = null;
    try {
      await this.mail.send(to, subject, body);
    } catch (e) {
      status = 'FAILED';
      error = (e as Error).message?.slice(0, 500) ?? 'Sending failed';
      this.log.warn(`${key} to ${to.email} failed: ${error}`);
    }
    await this.prisma.emailMessage.create({
      data: {
        userId, toEmail: to.email, toName: to.name, category: cfg.group, subject, body,
        status, error, notified: false, sentByName: 'Automatic', templateKey: key, refId: opts.refId ?? null,
      },
    });
    return status === 'SENT';
  }

  private async saved(): Promise<Saved> {
    const rows = await this.prisma.setting.findMany({ where: { key: { startsWith: AUTO_EMAILS_SETTING_KEY } } });
    const out: Saved = {};
    for (const r of rows) out[r.key.slice(AUTO_EMAILS_SETTING_KEY.length)] = (r.value ?? {}) as Saved[string];
    return out;
  }

  private merge(d: AutoEmailDef, s?: { enabled?: boolean; subject?: string; body?: string }): AutoEmailConfig {
    return {
      ...d,
      enabled: typeof s?.enabled === 'boolean' ? s.enabled : true,
      subject: s?.subject || d.subject,
      body: s?.body || d.body,
      custom: !!(s?.subject || s?.body),
      defaultSubject: d.subject,
      defaultBody: d.body,
    };
  }
}
