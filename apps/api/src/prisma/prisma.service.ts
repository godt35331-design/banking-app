import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // Each round trip to the Atlas cluster takes ~0.5 s from here, so a deposit (several steps in one
      // transaction) can take 4–6 s. Prisma's default limit is 5 s, which made deposits fail at random
      // with "internal server error". Allow up to 30 s, and wait up to 10 s to start one.
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
