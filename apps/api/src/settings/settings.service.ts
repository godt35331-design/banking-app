import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutoMailService } from '../common/auto-mail.service';
import { emailDate } from '../common/auto-emails';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService, private readonly autoMail: AutoMailService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { passwordHash, pinHash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string; theme?: string; mainCurrency?: any }) {
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    const { passwordHash, pinHash, ...profile } = user;
    return profile;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const argon2 = await import('argon2');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new Error('Current password is incorrect');
    const hash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    this.autoMail.queue('password_changed', userId, { by: 'by you', date: emailDate() });
    return { ok: true };
  }

  async changePin(userId: string, currentPin: string, newPin: string) {
    const argon2 = await import('argon2');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.pinHash) throw new Error('PIN not set');
    if (!/^\d{4}$/.test(newPin ?? '')) throw new BadRequestException('Your new PIN must be exactly 4 digits');
    const valid = await argon2.verify(user.pinHash, currentPin);
    if (!valid) throw new Error('Current PIN is incorrect');
    const hash = await argon2.hash(newPin);
    await this.prisma.user.update({ where: { id: userId }, data: { pinHash: hash, pinLength: newPin.length } });
    this.autoMail.queue('pin_changed', userId, { by: 'by you', date: emailDate() });
    return { ok: true };
  }

  async getBankSettings() {
    const s = await this.prisma.setting.findUnique({ where: { key: 'bank' } });
    return s?.value ?? {};
  }
}
