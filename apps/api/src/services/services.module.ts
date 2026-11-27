import { Module } from '@nestjs/common';
import { AdminTaxRecoveryController, ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { TaxRecoveryService } from './tax-recovery.service';

@Module({
  controllers: [ServicesController, AdminTaxRecoveryController],
  providers: [ServicesService, TaxRecoveryService],
  exports: [ServicesService, TaxRecoveryService],
})
export class ServicesModule {}
