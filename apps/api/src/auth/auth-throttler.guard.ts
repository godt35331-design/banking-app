import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limits sign-in and sign-up attempts. Attempts are counted per IP address and email together,
 * so someone guessing one account's password is slowed down without blocking other customers.
 * Behind a proxy (Nginx, Render, Railway…) set TRUST_PROXY=1 so the real visitor IP is used.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ips?.length ? req.ips[0] : req.ip;
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    return `${ip}|${email}`;
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Too many attempts. Please wait a few minutes and try again.');
  }
}
