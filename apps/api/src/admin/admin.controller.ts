import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { BankSettings } from '@kestrel/shared';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';

type Actor = { sub: string };
const int = (v?: string) => (v ? parseInt(v, 10) || undefined : undefined);

/** Bank staff only. Every write is recorded in the activity log by AdminService. */
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // Overview
  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  // Customers
  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('kyc') kyc?: string,
  ) {
    return this.admin.listUsers({ page: int(page), search, status, kyc });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Patch('users/:id/status')
  updateStatus(@CurrentUser() a: Actor, @Param('id') id: string, @Body() b: { status: 'ACTIVE' | 'FROZEN' | 'LOCKED'; reason?: string }) {
    return this.admin.updateUserStatus(a, id, b?.status, b?.reason);
  }

  @Patch('users/:id/kyc')
  updateKyc(@CurrentUser() a: Actor, @Param('id') id: string, @Body() b: { kycStatus: any; note?: string }) {
    return this.admin.updateKyc(a, id, b?.kycStatus, b?.note);
  }

  @Patch('users/:id/profile')
  updateProfile(@CurrentUser() a: Actor, @Param('id') id: string, @Body() b: { name?: string; phone?: string; email?: string }) {
    return this.admin.updateProfile(a, id, b ?? {});
  }

  @Patch('users/:id/withdrawal-hold')
  withdrawalHold(@CurrentUser() a: Actor, @Param('id') id: string, @Body() b: { hold: boolean; note?: string }) {
    return this.admin.setWithdrawalHold(a, id, b?.hold === true, b?.note);
  }

  @Post('users/:id/reset-password')
  resetPassword(@CurrentUser() a: Actor, @Param('id') id: string, @Body('value') value: string) {
    return this.admin.resetCredential(a, id, 'password', value);
  }

  @Post('users/:id/reset-pin')
  resetPin(@CurrentUser() a: Actor, @Param('id') id: string, @Body('value') value: string) {
    return this.admin.resetCredential(a, id, 'pin', value);
  }

  @Post('users/:id/adjust')
  adjust(
    @CurrentUser() a: Actor,
    @Param('id') id: string,
    @Body() b: { walletId: string; direction: 'IN' | 'OUT'; amountMinor: number; reason: string },
  ) {
    return this.admin.adjustWallet(a, id, b ?? ({} as any));
  }

  // Approvals
  @Get('approvals')
  approvals() {
    return this.admin.approvals();
  }

  @Patch('approvals/:id')
  decideTransfer(@CurrentUser() a: Actor, @Param('id') id: string, @Body() b: { approve: boolean; reason?: string; payoutReference?: string }) {
    return this.admin.decideTransfer(a, id, b?.approve === true, b?.reason, b?.payoutReference);
  }

  @Patch('approvals/:id/note')
  withdrawalNote(@CurrentUser() a: Actor, @Param('id') id: string, @Body('note') note: string) {
    return this.admin.setWithdrawalNote(a, id, note);
  }

  @Patch('checks/:id')
  decideCheck(@CurrentUser() a: Actor, @Param('id') id: string, @Body() b: { clear: boolean; reason?: string }) {
    return this.admin.decideCheck(a, id, b?.clear === true, b?.reason);
  }

  // Transactions
  @Get('transactions')
  transactions(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.admin.transactions({ page: int(page), search, kind, status, userId });
  }

  @Post('transactions/:id/reverse')
  reverse(@CurrentUser() a: Actor, @Param('id') id: string, @Body('reason') reason: string) {
    return this.admin.reverseTransaction(a, id, reason);
  }

  // Cards
  @Get('cards')
  cards(@Query('search') search?: string, @Query('status') status?: string) {
    return this.admin.cards({ search, status });
  }

  @Patch('cards/:id')
  updateCard(@CurrentUser() a: Actor, @Param('id') id: string, @Body() b: { status?: any; monthlyLimitMinor?: number | null }) {
    return this.admin.updateCard(a, id, b ?? {});
  }

  // Loan applications: see src/loans (admin/loans routes).

  // Funds Recovery Assistance cases: see src/recovery (admin/recovery routes).

  // Support inbox
  @Get('support/threads')
  threads() {
    return this.admin.supportThreads();
  }

  @Get('support/threads/:userId')
  thread(@Param('userId') userId: string) {
    return this.admin.supportMessages(userId);
  }

  @Post('support/threads/:userId')
  reply(@CurrentUser() a: Actor, @Param('userId') userId: string, @Body('body') body: string) {
    return this.admin.supportReply(a, userId, body);
  }

  // Bank settings
  @Get('settings')
  settings() {
    return this.admin.getSettings();
  }

  @Put('settings')
  updateSettings(@CurrentUser() a: Actor, @Body() b: BankSettings) {
    return this.admin.updateSettings(a, b);
  }

  // Activity log
  @Get('audit')
  audit(@Query('page') page?: string) {
    return this.admin.auditLog(int(page) ?? 1);
  }
}
