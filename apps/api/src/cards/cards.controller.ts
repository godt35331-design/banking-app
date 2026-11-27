import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CardsService } from './cards.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { CreateCardDto } from './dto/create-card.dto';

@Controller('cards')
@UseGuards(JwtGuard)
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateCardDto) {
    return this.cards.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.cards.list(user.sub);
  }

  @Get(':id')
  get(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cards.get(user.sub, id);
  }

  @Get(':id/reveal')
  reveal(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cards.reveal(user.sub, id);
  }

  @Patch(':id/limit')
  setLimit(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { monthlyLimitMinor: number | null },
  ) {
    return this.cards.setLimit(user.sub, id, body?.monthlyLimitMinor ?? null);
  }

  @Patch(':id/freeze')
  freeze(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cards.freeze(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cards.remove(user.sub, id);
  }
}
