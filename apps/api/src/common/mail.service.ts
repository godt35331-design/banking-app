import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BANK_NAME } from '@kestrel/shared';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private readonly apiKey: string | null;
  readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY') || config.get<string>('SMTP_PASS') || null;
    this.from = config.get<string>('MAIL_FROM') || `${BANK_NAME} <no-reply@sterlingcrestbank.com>`;
  }

  get configured() {
    return !!this.apiKey && !!this.from;
  }

  async send(to: { email: string; name: string }, subject: string, body: string) {
    if (!this.apiKey) throw new Error('Email is not set up (RESEND_API_KEY or SMTP_PASS missing)');

    const textBody = `${body}\n\n—\n${BANK_NAME}\nWe will never ask for your password, PIN or full card number by email.`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [`${to.name} <${to.email}>`],
        subject,
        text: textBody,
        html: this.html(subject, body),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.log.error(`Resend API error: ${res.status} ${err}`);
      throw new Error(`Email failed: ${res.status}`);
    }

    const data = await res.json();
    this.log.log(`Sent "${subject}" to ${to.email} (${data.id})`);
    return data.id as string;
  }

  private html(subject: string, body: string) {
    const paragraphs = body
      .split(/\n{2,}/)
      .map(p => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
    return `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td align="center" style="background:#14161a;color:#ffffff;padding:22px 28px;font-size:17px;font-weight:bold">${esc(BANK_NAME)}</td></tr>
<tr><td style="padding:28px 28px 8px"><h1 style="margin:0 0 18px;font-size:20px">${esc(subject)}</h1>${paragraphs}</td></tr>
<tr><td style="padding:8px 28px 24px;font-size:12px;color:#77736d;border-top:1px solid #eee">
You're getting this email because you have an account with ${esc(BANK_NAME)}.<br>
We will never ask for your password, PIN or full card number by email.</td></tr>
</table></td></tr></table></body></html>`;
  }
}
