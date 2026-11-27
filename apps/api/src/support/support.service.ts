import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(userId: string, body: string, sender: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
    const msg = await this.prisma.supportMessage.create({
      data: { userId, sender, body },
    });

    if (sender === 'CUSTOMER') {
      setTimeout(async () => {
        await this.prisma.supportMessage.create({
          data: {
            userId,
            sender: 'BOT',
            body: 'Thank you for reaching out. A support agent will respond shortly. For urgent matters, please call our helpline at 1-800-KESTREL.',
          },
        });
      }, 1500);
    }

    return msg;
  }

  async getMessages(userId: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getThreads() {
    const latestMessages = await this.prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      include: { user: { select: { id: true, name: true, email: true } } },
      take: 50,
    });
    return latestMessages;
  }

  async markRead(userId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { userId, readAt: null, sender: { not: 'CUSTOMER' } },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
