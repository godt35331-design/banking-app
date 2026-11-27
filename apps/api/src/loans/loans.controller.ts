import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { LOAN_DOC_MAX_BYTES } from '@kestrel/shared';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';
import { sendDoc, type UploadedDoc } from '../common/uploads';
import { LoansService, type DraftInput } from './loans.service';

type Me = { sub: string; role?: string };

/** Customer loan portal: products, applications, documents, offers, agreements, messages. */
@Controller('loans')
@UseGuards(JwtGuard)
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get('products')
  products() {
    return this.loans.products();
  }

  @Get('applications')
  list(@CurrentUser() u: Me) {
    return this.loans.list(u.sub);
  }

  @Post('applications')
  create(@CurrentUser() u: Me, @Body('product') product: string) {
    this.loans.assertCustomer(u.role);
    return this.loans.create(u.sub, product);
  }

  @Get('centre')
  centre(@CurrentUser() u: Me) {
    return this.loans.centre(u.sub);
  }

  @Get('updates')
  updates(@CurrentUser() u: Me) {
    return this.loans.updates(u.sub);
  }

  @Get('applications/:id')
  get(@CurrentUser() u: Me, @Param('id') id: string) {
    return this.loans.get(u.sub, id);
  }

  @Patch('applications/:id')
  update(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: DraftInput) {
    return this.loans.updateDraft(u.sub, id, b ?? {});
  }

  @Delete('applications/:id')
  remove(@CurrentUser() u: Me, @Param('id') id: string) {
    return this.loans.deleteDraft(u.sub, id);
  }

  @Post('applications/:id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LOAN_DOC_MAX_BYTES, files: 1 } }))
  upload(
    @CurrentUser() u: Me,
    @Param('id') id: string,
    @UploadedFile() file: UploadedDoc | undefined,
    @Body('kind') kind: string,
    @Body('requestId') requestId?: string,
  ) {
    return this.loans.upload(u.sub, id, file, kind || 'ADDITIONAL', requestId || undefined);
  }

  @Delete('applications/:id/documents/:docId')
  removeDoc(@CurrentUser() u: Me, @Param('id') id: string, @Param('docId') docId: string) {
    return this.loans.deleteDocument(u.sub, id, docId);
  }

  @Get('applications/:id/documents/:docId')
  async doc(@CurrentUser() u: Me, @Param('id') id: string, @Param('docId') docId: string, @Res() res: Response) {
    sendDoc(res, await this.loans.document(id, docId, u.sub));
  }

  @Post('applications/:id/submit')
  submit(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: { accurate?: boolean; checks?: boolean; terms?: boolean }) {
    return this.loans.submit(u.sub, id, b ?? {});
  }

  @Post('applications/:id/messages')
  message(@CurrentUser() u: Me, @Param('id') id: string, @Body('body') body: string) {
    return this.loans.message(u.sub, id, body);
  }

  @Post('applications/:id/messages/read')
  read(@CurrentUser() u: Me, @Param('id') id: string) {
    return this.loans.markRead(u.sub, id);
  }

  @Post('applications/:id/offer')
  offer(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: { accept: boolean; comment?: string }) {
    return this.loans.decideOffer(u.sub, id, b?.accept === true, b?.comment);
  }

  @Post('applications/:id/repayments/pay')
  pay(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: { walletId: string; count?: number }) {
    return this.loans.payRepayment(u.sub, id, b?.walletId, b?.count);
  }

  @Post('applications/:id/sign')
  sign(@CurrentUser() u: Me, @Param('id') id: string, @Body() b: { name: string; agree: boolean }) {
    return this.loans.sign(u.sub, id, b?.name, b?.agree === true);
  }
}

/** Loan officers: review, verify, assess, forward, record decisions, offers, signatures and disbursement. */
@Controller('admin/loans')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminLoansController {
  constructor(private readonly loans: LoansService) {}

  @Get()
  list(
    @CurrentUser() a: Me,
    @Query('status') status?: string,
    @Query('product') product?: string,
    @Query('search') search?: string,
    @Query('assigned') assigned?: string,
  ) {
    return this.loans.adminList({ status, product, search, assigned }, a);
  }

  @Get('stats')
  stats() {
    return this.loans.adminStats();
  }

  @Get('staff')
  staff() {
    return this.loans.staff();
  }

  @Get('products')
  products() {
    return this.loans.products();
  }

  @Put('products/:key')
  updateProduct(@CurrentUser() a: Me, @Param('key') key: string, @Body() b: any) {
    return this.loans.updateProduct(a, key, b ?? {});
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.loans.adminGet(id);
  }

  @Patch(':id/status')
  status(@CurrentUser() a: Me, @Param('id') id: string, @Body() b: any) {
    return this.loans.setStatus(a, id, b ?? {});
  }

  @Patch(':id/assign')
  assign(@CurrentUser() a: Me, @Param('id') id: string, @Body('staffId') staffId: string | null) {
    return this.loans.assign(a, id, staffId || null);
  }

  @Patch(':id/assessment')
  assessment(@CurrentUser() a: Me, @Param('id') id: string, @Body() b: any) {
    return this.loans.saveAssessment(a, id, b ?? {});
  }

  @Post(':id/forward')
  forward(@CurrentUser() a: Me, @Param('id') id: string, @Body() b: { lender: string; note?: string }) {
    return this.loans.forward(a, id, b?.lender, b?.note);
  }

  @Patch(':id/documents/:docId')
  reviewDoc(@CurrentUser() a: Me, @Param('id') id: string, @Param('docId') docId: string, @Body() b: { review: string; note?: string }) {
    return this.loans.reviewDocument(a, id, docId, b?.review, b?.note);
  }

  @Get(':id/documents/:docId')
  async doc(@Param('id') id: string, @Param('docId') docId: string, @Res() res: Response) {
    sendDoc(res, await this.loans.document(id, docId));
  }

  @Post(':id/notes')
  note(@CurrentUser() a: Me, @Param('id') id: string, @Body('note') note: string) {
    return this.loans.addNote(a, id, note);
  }

  @Post(':id/messages')
  message(@CurrentUser() a: Me, @Param('id') id: string, @Body('body') body: string) {
    return this.loans.staffMessage(a, id, body);
  }

  @Post(':id/messages/read')
  read(@Param('id') id: string) {
    return this.loans.staffMarkRead(id);
  }

  @Post(':id/repayments/schedule')
  schedule(@CurrentUser() a: Me, @Param('id') id: string) {
    return this.loans.createScheduleNow(a, id);
  }

  @Post(':id/repayments/:repaymentId/record')
  record(@CurrentUser() a: Me, @Param('id') id: string, @Param('repaymentId') rid: string, @Body('reference') reference?: string) {
    return this.loans.recordRepayment(a, id, rid, reference);
  }

  @Delete(':id/requests/:requestId')
  cancelRequest(@CurrentUser() a: Me, @Param('id') id: string, @Param('requestId') requestId: string) {
    return this.loans.cancelRequest(a, id, requestId);
  }
}
