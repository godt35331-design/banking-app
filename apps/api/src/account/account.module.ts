import { Module } from '@nestjs/common';
import { AccountController, AdminKycController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  controllers: [AccountController, AdminKycController],
  providers: [AccountService],
})
export class AccountModule {}
