import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BANK_NAME } from '@kestrel/shared';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private readonly apiKey: string | null;
  private readonly logoUrl: string;
  readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY') || config.get<string>('SMTP_PASS') || null;
    this.from = config.get<string>('MAIL_FROM') || `${BANK_NAME} <no-reply@sterlingcrestbank.com>`;
    // Must be a public https URL: email apps can't load images from localhost.
    this.logoUrl = config.get<string>('MAIL_LOGO_URL') || 'https://www.sterlingcrestbank.com/logo-email.png';
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
    return `<!doctype html><html><body style="margin:0;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;background:#ffffff">
<img src="${this.logoUrl}" alt="${esc(BANK_NAME)}" width="120" height="87" style="display:block;width:120px;height:87px;border:0;outline:none;margin-bottom:24px">
<h1 style="margin:0 0 18px;font-size:20px;font-weight:600">${esc(subject)}</h1>
${paragraphs}
<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#77736d;line-height:1.5">
${esc(BANK_NAME)}<br>We will never ask for your password, PIN or full card number by email.</p>
</body></html>`;
  }
}
