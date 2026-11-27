import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Services module. Tax refund claims live in tax-recovery.service.ts;
 * Funds Recovery Assistance lives in src/recovery.
 */
@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}
}
