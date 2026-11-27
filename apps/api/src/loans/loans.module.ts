import { Module } from '@nestjs/common';
import { AdminLoansController, LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  controllers: [LoansController, AdminLoansController],
  providers: [LoansService],
})
export class LoansModule {}
