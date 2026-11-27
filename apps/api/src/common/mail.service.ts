import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { resolve } from 'path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { BANK_NAME } from '@kestrel/shared';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Sends email through any SMTP server (Gmail app password, Brevo, Resend, Mailgun, Zoho…).
 * Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in apps/api/.env.
 * Without them, `configured` is false and nothing is sent.
 */
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private transport: Transporter | null = null;
  readonly from: string;
  /** The bank logo, embedded in every email (so it shows without hosting it anywhere). */
  private readonly logoPath: string | null;

  constructor(config: ConfigService) {
    const candidates = [
      config.get<string>('MAIL_LOGO_PATH'),
      resolve(__dirname, '../../../web/public/logo-light.png'), // apps/api/dist/common → apps/web/public
      resolve(process.cwd(), '../web/public/logo-light.png'),
      resolve(process.cwd(), 'apps/web/public/logo-light.png'),
    ].filter((p): p is string => !!p);
    this.logoPath = candidates.find(p => existsSync(p)) ?? null;
    if (!this.logoPath) this.log.warn('Logo not found; emails will show the bank name instead');

    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.from = config.get<string>('MAIL_FROM') || (user ? `${BANK_NAME} <${user}>` : '');
    if (host && user && pass) {
      this.transport = nodemailer.createTransport({
        host, port,
        secure: (config.get<string>('SMTP_SECURE') ?? (port === 465 ? 'true' : 'false')) === 'true',
        auth: { user, pass },
      });
    }
  }

  get configured() {
    return this.transport !== null && !!this.from;
  }

  /** Plain text body; paragraphs and line breaks are kept. Throws if sending fails. */
  async send(to: { email: string; name: string }, subject: string, body: string) {
    if (!this.transport) throw new Error('Email is not set up (SMTP settings missing)');
    const info = await this.transport.sendMail({
      from: this.from,
      to: `"${to.name.replace(/"/g, '')}" <${to.email}>`,
      subject,
      text: `${body}\n\n—\n${BANK_NAME}\nWe will never ask for your password, PIN or full card number by email.`,
      html: this.html(subject, body),
      attachments: this.logoPath ? [{ filename: 'logo.png', path: this.logoPath, cid: 'bank-logo' }] : [],
    });
    this.log.log(`Sent "${subject}" to ${to.email} (${info.messageId})`);
    return info.messageId as string;
  }

  private html(subject: string, body: string) {
    const paragraphs = body
      .split(/\n{2,}/)
      .map(p => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
    return `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td align="center" style="background:#14161a;color:#ffffff;padding:22px 28px;font-size:17px;font-weight:bold">${
      this.logoPath
        ? `<img src="cid:bank-logo" alt="${esc(BANK_NAME)}" height="84" style="display:block;height:84px;width:auto;border:0;outline:none">`
        : esc(BANK_NAME)
    }</td></tr>
<tr><td style="padding:28px 28px 8px"><h1 style="margin:0 0 18px;font-size:20px">${esc(subject)}</h1>${paragraphs}</td></tr>
<tr><td style="padding:8px 28px 24px;font-size:12px;color:#77736d;border-top:1px solid #eee">
You're getting this email because you have an account with ${esc(BANK_NAME)}.<br>
We will never ask for your password, PIN or full card number by email.</td></tr>
</table></td></tr></table></body></html>`;
  }
}
