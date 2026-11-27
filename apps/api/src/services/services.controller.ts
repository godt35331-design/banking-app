import { Body, Controller, Get, Param, Patch, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TAX_DOCUMENTS, TAX_DOC_MAX_BYTES } from '@kestrel/shared';
import { ServicesService } from './services.service';
import { TaxRecoveryService } from './tax-recovery.service';
import { sendDoc, type UploadedDoc } from '../common/uploads';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';
import { CreateTaxRecoveryDto, PayTaxRefundDto, ReviewTaxRecoveryDto } from './dto/create-tax-recovery.dto';

const taxUploads = FileFieldsInterceptor(
  TAX_DOCUMENTS.map(d => ({ name: d.type, maxCount: 1 })),
  { limits: { fileSize: TAX_DOC_MAX_BYTES, files: TAX_DOCUMENTS.length } },
);


@Controller('services')
@UseGuards(JwtGuard)
export class ServicesController {
  constructor(
    private readonly services: ServicesService,
    private readonly tax: TaxRecoveryService,
  ) {}

  // ── Tax refund claims ──

  @Post('tax-recovery')
  @UseInterceptors(taxUploads)
  createTaxRecovery(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateTaxRecoveryDto,
    @UploadedFiles() files: Record<string, UploadedDoc[] | undefined>,
  ) {
    return this.tax.create(user.sub, dto, files);
  }

  @Get('tax-recovery')
  listTaxRecoveries(@CurrentUser() user: { sub: string }) {
    return this.tax.list(user.sub);
  }

  @Get('tax-recovery/:id')
  getTaxRecovery(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.tax.get(user.sub, id);
  }

  @Get('tax-recovery/:id/documents/:type')
  async taxDocument(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    sendDoc(res, await this.tax.document(id, type, user.sub));
  }

}

/** Admin side of tax refund claims: review, status updates and refund payment. */
@Controller('admin/tax-recoveries')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminTaxRecoveryController {
  constructor(private readonly tax: TaxRecoveryService) {}

  @Get()
  list() {
    return this.tax.listAll();
  }

  @Patch(':id/status')
  review(@Param('id') id: string, @Body() dto: ReviewTaxRecoveryDto) {
    return this.tax.review(id, dto);
  }

  @Post(':id/pay')
  pay(@Param('id') id: string, @Body() dto: PayTaxRefundDto) {
    return this.tax.pay(id, dto);
  }

  @Get(':id/documents/:type')
  async document(@Param('id') id: string, @Param('type') type: string, @Res() res: Response) {
    sendDoc(res, await this.tax.document(id, type));
  }
}
