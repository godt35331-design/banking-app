import { Module } from '@nestjs/common';
import { AdminRecoveryController, RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';

@Module({
  controllers: [RecoveryController, AdminRecoveryController],
  providers: [RecoveryService],
})
export class RecoveryModule {}
