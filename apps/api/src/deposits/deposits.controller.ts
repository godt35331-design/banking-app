import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { CreateDepositDto } from './dto/deposit.dto';

@Controller('deposits')
@UseGuards(JwtGuard)
export class DepositsController {
  constructor(private readonly deposits: DepositsService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateDepositDto) {
    return this.deposits.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.deposits.list(user.sub);
  }
}
