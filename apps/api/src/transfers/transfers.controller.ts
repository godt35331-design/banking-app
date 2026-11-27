import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { CreateTransferDto } from './dto/transfer.dto';

@Controller('transfers')
@UseGuards(JwtGuard)
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateTransferDto) {
    return this.transfers.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.transfers.list(user.sub);
  }
}
