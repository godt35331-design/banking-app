import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { generateAccountNumber } from '../common/card-crypto';
import { MailService } from '../common/mail.service';
import { AutoMailService } from '../common/auto-mail.service';
import { emailDate } from '../common/auto-emails';

@Injectable()
export class AuthService {
  /** Used when the email doesn't exist, so a wrong email takes as long as a wrong password. */
  private dummyHash: Promise<string> = argon2.hash('not-a-real-password-' + Math.random());

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly autoMail: AutoMailService,
  ) {}

  /** Emails are always stored in lowercase, so "Mbah@x.com" and "mbah@x.com" are the same account. */
  private findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  async register(dto: RegisterDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('An account with this email already exists. Try signing in.');

    const passwordHash = await argon2.hash(dto.password);
    const pinHash = await argon2.hash(dto.pin);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone || null,
        passwordHash,
        pinHash,
        pinLength: dto.pin.length,
        wallets: {
          create: {
            currency: 'USD',
            balanceMinor: 0,
            accountNumber: generateAccountNumber(),
          },
        },
      },
      include: { wallets: true },
    });

    this.autoMail.queue('welcome', user.id);
    return { token: this.signToken(user.id, user.role), user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.findByEmail(dto.email);
    if (!user) {
      await argon2.verify(await this.dummyHash, dto.password).catch(() => false);
      throw new UnauthorizedException('Wrong email or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password).catch(() => false);
    if (!passwordValid) throw new UnauthorizedException('Wrong email or password');

    // Only reveal the lock to someone who knows the password.
    if (user.status === 'LOCKED') throw new UnauthorizedException('This account is locked. Please contact the bank.');

    if (!user.pinHash) throw new UnauthorizedException('PIN not set up');

    const pinValid = await argon2.verify(user.pinHash, dto.pin);
    if (!pinValid) {
      const fails = user.pinFails + 1;
      const s = await this.prisma.setting.findUnique({ where: { key: 'bank' } });
      const maxAttempts = Number((s?.value as any)?.pinAttempts) || 5;
      if (fails >= maxAttempts) {
        await this.prisma.user.update({ where: { id: user.id }, data: { status: 'LOCKED', pinFails: fails } });
        this.autoMail.queue('pin_lockout', user.id, { date: emailDate() });
        throw new UnauthorizedException('Account locked due to too many PIN attempts');
      }
      await this.prisma.user.update({ where: { id: user.id }, data: { pinFails: fails } });
      throw new UnauthorizedException('Invalid PIN');
    }

    if (user.pinFails > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: { pinFails: 0 } });
    }

    return { token: this.signToken(user.id, user.role), user: this.sanitize(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { wallets: true },
    });
    return this.sanitize(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findByEmail(dto.email);
    if (!user) return { ok: true };

    const code = String(randomInt(100_000, 999_999));
    const resetCodeExp = new Date(Date.now() + 15 * 60_000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetCode: await argon2.hash(code), resetCodeExp },
    });

    if (this.mail.configured) {
      await this.mail.send(
        { email: user.email, name: user.name },
        'Password reset code',
        `Your password reset code is:\n\n${code}\n\nThis code expires in 15 minutes. If you did not request a password reset, please ignore this email and your password will remain unchanged.`,
      );
    }

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findByEmail(dto.email);
    if (!user || !user.resetCode || !user.resetCodeExp) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (new Date() > user.resetCodeExp) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetCode: null, resetCodeExp: null },
      });
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    const valid = await argon2.verify(user.resetCode, dto.code).catch(() => false);
    if (!valid) {
      throw new BadRequestException('Invalid reset code');
    }

    const passwordHash = await argon2.hash(dto.password);
    const pinHash = await argon2.hash(dto.pin);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, pinHash, pinLength: dto.pin.length, pinFails: 0, resetCode: null, resetCodeExp: null },
    });

    if (this.mail.configured) {
      await this.mail.send(
        { email: user.email, name: user.name },
        'Your password has been changed',
        'Your password was successfully changed. If you did not make this change, please contact our support team immediately.',
      );
    }

    return { ok: true };
  }

  signToken(userId: string, role: string) {
    return this.jwt.sign({ sub: userId, role });
  }

  private sanitize(user: any) {
    const { passwordHash, pinHash, ...rest } = user;
    return rest;
  }
}
