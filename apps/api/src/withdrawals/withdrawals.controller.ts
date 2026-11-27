import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { WithdrawalsService, type WithdrawalInput } from './withdrawals.service';

type Me = { sub: string; role?: string };

@Controller('withdrawals')
@UseGuards(JwtGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Get()
  list(@CurrentUser() u: Me) {
    return this.withdrawals.list(u.sub);
  }

  @Post()
  create(@CurrentUser() u: Me, @Body() b: WithdrawalInput) {
    if (u.role === 'ADMIN') throw new ForbiddenException('Staff accounts have no wallets to withdraw from');
    return this.withdrawals.create(u.sub, b ?? ({} as WithdrawalInput));
  }
}
