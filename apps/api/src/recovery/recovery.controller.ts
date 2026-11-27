import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RECOVERY_DOC_MAX_BYTES } from '@kestrel/shared';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';
import { sendDoc, type UploadedDoc } from '../common/uploads';
import { RecoveryService, type DraftInput } from './recovery.service';

type Me = { sub: string; role?: string };

/** Customer portal: Funds Recovery Assistance applications. */
@Controller('recovery')
@UseGuards(JwtGuard)
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}

  @Get('cases')
  list(@CurrentUser() u: Me) {
    return this.recovery.list(u.sub);
  }

  @Post('cases')
  create(@CurrentUser() u: Me, @Body() b: DraftInput & { category: string }) {
    this.recovery.assertCustomer(u.role);
    return this.recovery.create(u.sub, b?.category, b ?? {});
  }

  @Get('centre')
  centre(@CurrentUser() u: Me) {
    return this.recovery.centre(u.sub);
  }

  @Get('cases/:id')
  get(@CurrentUser() u: Me, @Param('id') id: string) {
    return this.recovery.get(u.sub, id);
  }

  @Patch('cases/:id')
  update(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: DraftInput) {
    return this.recovery.updateDraft(u.sub, id, b ?? {});
  }

  @Delete('cases/:id')
  remove(@CurrentUser() u: Me, @Param('id') id: string) {
    return this.recovery.deleteDraft(u.sub, id);
  }

  @Post('cases/:id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: RECOVERY_DOC_MAX_BYTES, files: 1 } }))
  upload(
    @CurrentUser() u: Me,
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('kind') kind: string,
    @Body('requestId') requestId?: string,
  ) {
    return this.recovery.upload(u.sub, id, file, kind || 'OTHER', requestId || undefined);
  }

  @Delete('cases/:id/documents/:docId')
  removeDoc(@CurrentUser() u: Me, @Param('id') id: string, @Param('docId') docId: string) {
    return this.recovery.deleteDocument(u.sub, id, docId);
  }

  @Get('cases/:id/documents/:docId')
  async doc(@CurrentUser() u: Me, @Param('id') id: string, @Param('docId') docId: string, @Res() res: Response) {
    sendDoc(res, await this.recovery.document(id, docId, u.sub));
  }

  @Post('cases/:id/submit')
  submit(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: { accurate?: boolean; terms?: boolean; noGuarantee?: boolean }) {
    return this.recovery.submit(u.sub, id, b ?? {});
  }

  @Post('cases/:id/messages')
  message(@CurrentUser() u: Me, @Param('id') id: string, @Body('body') body: string) {
    return this.recovery.message(u.sub, id, body);
  }

  @Post('cases/:id/messages/read')
  read(@CurrentUser() u: Me, @Param('id') id: string) {
    return this.recovery.markRead(u.sub, id);
  }

  @Post('cases/:id/proposal')
  proposal(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: { approve: boolean; comment?: string }) {
    return this.recovery.decideProposal(u.sub, id, b?.approve === true, b?.comment);
  }
}

/** Case officers: review, request documents, message, change status, record outcome. */
@Controller('admin/recovery')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminRecoveryController {
  constructor(private readonly recovery: RecoveryService) {}

  @Get()
  list(@Query('status') status?: string, @Query('category') category?: string, @Query('search') search?: string) {
    return this.recovery.adminList({ status, category, search });
  }

  @Get('counts')
  counts() {
    return this.recovery.adminCounts();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.recovery.adminGet(id);
  }

  @Patch(':id/status')
  status(@CurrentUser() a: Me, @Param('id') id: string, @Body() b: any) {
    return this.recovery.setStatus(a, id, b ?? {});
  }

  @Post(':id/notes')
  note(@CurrentUser() a: Me, @Param('id') id: string, @Body('note') note: string) {
    return this.recovery.addNote(a, id, note);
  }

  @Post(':id/messages')
  message(@CurrentUser() a: Me, @Param('id') id: string, @Body('body') body: string) {
    return this.recovery.staffMessage(a, id, body);
  }

  @Post(':id/messages/read')
  read(@Param('id') id: string) {
    return this.recovery.staffMarkRead(id);
  }

  @Delete(':id/requests/:requestId')
  cancelRequest(@CurrentUser() a: Me, @Param('id') id: string, @Param('requestId') requestId: string) {
    return this.recovery.cancelRequest(a, id, requestId);
  }

  @Get(':id/documents/:docId')
  async doc(@Param('id') id: string, @Param('docId') docId: string, @Res() res: Response) {
    sendDoc(res, await this.recovery.document(id, docId));
  }
}
