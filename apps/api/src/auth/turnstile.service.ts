import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Cloudflare Turnstile bot check. Off until TURNSTILE_SECRET_KEY is set. */
@Injectable()
export class TurnstileService {
  private readonly log = new Logger('Turnstile');
  private readonly secret: string | undefined;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('TURNSTILE_SECRET_KEY') || undefined;
  }

  async verify(token: string | undefined, ip?: string) {
    if (!this.secret) return;
    if (!token) throw new BadRequestException('Please complete the security check.');

    const form = new URLSearchParams({ secret: this.secret, response: token });
    if (ip) form.set('remoteip', ip);
    let ok = false;
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
      const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
      ok = data.success === true;
      if (!ok) this.log.warn(`Rejected: ${(data['error-codes'] ?? []).join(', ')}`);
    } catch (e) {
      this.log.error(`Verification request failed: ${(e as Error).message}`);
    }
    if (!ok) throw new BadRequestException('Security check failed. Please try again.');
  }
}
