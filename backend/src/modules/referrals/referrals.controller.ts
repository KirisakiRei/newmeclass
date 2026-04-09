import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthAudience, Role } from '@prisma/client';
import { AuthAudienceAccess } from 'src/common/auth/auth-audience.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferralWithdrawalDto } from './dto/create-referral-withdrawal.dto';
import { ProcessReferralWithdrawalDto } from './dto/process-referral-withdrawal.dto';
import { ReferralsService } from './referrals.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { ReferralTransactionsQueryDto } from './dto/referral-transactions-query.dto';

@Controller('referrals')
export class ReferralsController {
  constructor(
    private readonly service: ReferralsService,
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Put('settings')
  @AdminPermission('referrals.edit')
  async updateSettings(@CurrentUser() user: any, @Req() req: any, @Body() body: UpdateReferralSettingsDto) {
    const before = await this.service.getSettings();
    const updated = await this.service.updateSettings(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_REFERRAL_SETTINGS_UPDATED',
      category: 'settings',
      targetType: 'referral_settings',
      targetId: 'userReferralProgramSettings',
      targetLabel: 'Pengaturan Referral',
      summary: 'Pengaturan referral user diperbarui.',
      before: before as any,
      after: updated as any,
      ipAddress: req?.ip,
    });
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @AuthAudienceAccess(AuthAudience.USER)
  @Roles(Role.USER)
  @Get('me/wallet')
  myWallet(@CurrentUser() user: any) {
    return this.service.getUserWallet(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @AuthAudienceAccess(AuthAudience.USER)
  @Roles(Role.USER)
  @Get('me/withdrawals')
  myWithdrawals(@CurrentUser() user: any) {
    return this.service.getUserWithdrawals(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @AuthAudienceAccess(AuthAudience.USER)
  @Roles(Role.USER)
  @Post('me/withdraw')
  requestWithdraw(@CurrentUser() user: any, @Body() body: CreateReferralWithdrawalDto) {
    return this.service.requestWithdraw(user.sub, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('leaderboard')
  @AdminPermission('referrals.view')
  leaderboard(@Query('limit') limit = '20') {
    return this.service.leaderboard(Number(limit));
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('transactions')
  @AdminPermission('referrals.view')
  transactions(@Query() query: ReferralTransactionsQueryDto) {
    return this.service.transactions(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('stats')
  @AdminPermission('referrals.view')
  stats() {
    return this.service.stats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('withdrawals')
  @AdminPermission('referrals.view')
  withdrawals(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listWithdrawals({ page, pageSize, status, search });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Put('withdrawals/:id/approve')
  @AdminPermission('referrals.edit')
  async approveWithdrawal(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: ProcessReferralWithdrawalDto) {
    const before = await this.prisma.disbursement.findUnique({ where: { id } });
    const updated = await this.service.approveWithdrawal(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_REFERRAL_WITHDRAWAL_REVIEWED',
      category: 'approval',
      targetType: 'referral_withdrawal',
      targetId: id,
      targetLabel: before?.userId || id,
      summary: `Withdrawal referral ${id} disetujui.`,
      before: before ? {
        status: before.status,
        amount: before.amount,
        note: before.notes,
      } : null,
      after: updated ? {
        status: updated.status,
        amount: before?.amount || null,
        note: updated.notes,
      } : null,
      meta: {
        decision: 'APPROVED',
      },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Put('withdrawals/:id/reject')
  @AdminPermission('referrals.edit')
  async rejectWithdrawal(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: ProcessReferralWithdrawalDto) {
    const before = await this.prisma.disbursement.findUnique({ where: { id } });
    const updated = await this.service.rejectWithdrawal(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_REFERRAL_WITHDRAWAL_REVIEWED',
      category: 'approval',
      targetType: 'referral_withdrawal',
      targetId: id,
      targetLabel: before?.userId || id,
      summary: `Withdrawal referral ${id} ditolak.`,
      before: before ? {
        status: before.status,
        amount: before.amount,
        note: before.notes,
      } : null,
      after: updated ? {
        status: updated.status,
        amount: before?.amount || null,
        note: updated.notes,
      } : null,
      meta: {
        decision: 'REJECTED',
      },
      ipAddress: req?.ip,
    });
    return updated;
  }
}
