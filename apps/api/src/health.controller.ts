import { Controller, Get } from '@nestjs/common';
import { BANK_NAME } from '@kestrel/shared';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database = 'down';
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      database = 'up';
    } catch {
      /* reported below */
    }
    return { ok: database === 'up', bank: BANK_NAME, database, mode: 'simulation' };
  }
}
