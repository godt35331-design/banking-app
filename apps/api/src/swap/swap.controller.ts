import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SwapService } from './swap.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { CreateSwapDto } from './dto/swap.dto';

@Controller('swap')
@UseGuards(JwtGuard)
export class SwapController {
  constructor(private readonly swap: SwapService) {}

  @Get('quote')
  quote(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount: string,
  ) {
    return this.swap.getQuote(from, to, parseInt(amount, 10));
  }

  @Post()
  execute(@CurrentUser() user: { sub: string }, @Body() dto: CreateSwapDto) {
    return this.swap.execute(user.sub, dto);
  }
}
