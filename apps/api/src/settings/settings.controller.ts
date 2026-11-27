import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';

@Controller('settings')
@UseGuards(JwtGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: { sub: string }) {
    return this.settings.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: { sub: string }, @Body() data: any) {
    return this.settings.updateProfile(user.sub, data);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: { sub: string },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.settings.changePassword(user.sub, body.currentPassword, body.newPassword);
  }

  @Post('change-pin')
  changePin(
    @CurrentUser() user: { sub: string },
    @Body() body: { currentPin: string; newPin: string },
  ) {
    return this.settings.changePin(user.sub, body.currentPin, body.newPin);
  }

  @Get('bank')
  bankSettings() {
    return this.settings.getBankSettings();
  }
}
