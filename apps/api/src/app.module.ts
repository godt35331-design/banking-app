import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { TransactionsController } from './transactions/transactions.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WalletsModule } from './wallets/wallets.module';
import { CardsModule } from './cards/cards.module';
import { TransfersModule } from './transfers/transfers.module';
import { DepositsModule } from './deposits/deposits.module';
import { SwapModule } from './swap/swap.module';
import { LoansModule } from './loans/loans.module';
import { ServicesModule } from './services/services.module';
import { AdminModule } from './admin/admin.module';
import { AccountModule } from './account/account.module';
import { RecoveryModule } from './recovery/recovery.module';
import { SettingsModule } from './settings/settings.module';
import { SupportModule } from './support/support.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { MailModule } from './common/mail.module';
import { RemindersService } from './common/reminders.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    WalletsModule,
    CardsModule,
    TransfersModule,
    DepositsModule,
    SwapModule,
    LoansModule,
    ServicesModule,
    AdminModule,
    AccountModule,
    RecoveryModule,
    SettingsModule,
    SupportModule,
    WithdrawalsModule,
  ],
  controllers: [HealthController, TransactionsController],
  providers: [RemindersService],
})
export class AppModule {}
