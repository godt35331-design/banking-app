import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { IsEnum } from 'class-validator';
import { Currency } from '@prisma/client';

class CreateWalletDto {
  @IsEnum(Currency)
  currency: Currency;
}

@Controller('wallets')
@UseGuards(JwtGuard)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateWalletDto) {
    return this.wallets.create(user.sub, dto.currency);
  }

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.wallets.list(user.sub);
  }

  @Get('balance')
  totalBalance(@CurrentUser() user: { sub: string }) {
    return this.wallets.totalBalanceMinor(user.sub);
  }

  @Get(':id')
  get(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.wallets.get(user.sub, id);
  }
}
