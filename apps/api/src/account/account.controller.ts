import { Body, Controller, Get, Param, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TAX_DOC_MAX_BYTES } from '@kestrel/shared';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';
import { sendDoc, type UploadedDoc } from '../common/uploads';
import { AccountService, KYC_FILES } from './account.service';

@Controller()
@UseGuards(JwtGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('notifications')
  notifications(@CurrentUser() u: { sub: string }) {
    return this.account.notifications(u.sub);
  }

  @Post('notifications/read')
  read(@CurrentUser() u: { sub: string }) {
    return this.account.markNotificationsRead(u.sub);
  }

  @Get('kyc')
  kyc(@CurrentUser() u: { sub: string }) {
    return this.account.kyc(u.sub);
  }

  @Post('kyc')
  @UseInterceptors(
    FileFieldsInterceptor(KYC_FILES.map(name => ({ name, maxCount: 1 })), {
      limits: { fileSize: TAX_DOC_MAX_BYTES, files: KYC_FILES.length },
    }),
  )
  submitKyc(
    @CurrentUser() u: { sub: string },
    @Body('idType') idType: string,
    @UploadedFiles() files: Record<string, UploadedDoc[] | undefined>,
  ) {
    return this.account.submitKyc(u.sub, idType, files);
  }

  @Get('kyc/documents/:type')
  async myDoc(@CurrentUser() u: { sub: string }, @Param('type') type: string, @Res() res: Response) {
    sendDoc(res, await this.account.kycDocument(u.sub, type));
  }
}

/** Staff access to a customer's identity documents. */
@Controller('admin/users')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminKycController {
  constructor(private readonly account: AccountService) {}

  @Get(':id/kyc-documents/:type')
  async doc(@Param('id') id: string, @Param('type') type: string, @Res() res: Response) {
    sendDoc(res, await this.account.kycDocument(id, type));
  }
}
