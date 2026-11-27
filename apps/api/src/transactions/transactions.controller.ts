import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller('transactions')
@UseGuards(JwtGuard)
export class TransactionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: { sub: string }, @Query('limit') limit?: string) {
    return this.prisma.transaction.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit ?? '50', 10), 100),
    });
  }
}
