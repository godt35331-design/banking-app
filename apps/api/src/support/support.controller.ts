import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';

@Controller('support')
@UseGuards(JwtGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post('messages')
  send(@CurrentUser() user: { sub: string }, @Body('body') body: string) {
    return this.support.sendMessage(user.sub, body);
  }

  @Get('messages')
  messages(@CurrentUser() user: { sub: string }) {
    return this.support.getMessages(user.sub);
  }

  @Post('messages/read')
  markRead(@CurrentUser() user: { sub: string }) {
    return this.support.markRead(user.sub);
  }

  @Get('threads')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  threads() {
    return this.support.getThreads();
  }

  @Post('threads/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  replyAsAdmin(@Param('userId') userId: string, @Body('body') body: string) {
    return this.support.sendMessage(userId, body, 'ADMIN');
  }
}
