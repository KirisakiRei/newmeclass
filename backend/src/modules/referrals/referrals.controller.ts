import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthAudience, Role } from '@prisma/client';
import { AuthAudienceAccess } from 'src/common/auth/auth-audience.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { CreateReferralWithdrawalDto } from './dto/create-referral-withdrawal.dto';
import { ProcessReferralWithdrawalDto } from './dto/process-referral-withdrawal.dto';
import { ReferralsService } from './referrals.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { ReferralTransactionsQueryDto } from './dto/referral-transactions-query.dto';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Put('settings')
  @AdminPermission('referrals.edit')
  updateSettings(@Body() body: UpdateReferralSettingsDto) {
    return this.service.updateSettings(body);
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
  approveWithdrawal(@Param('id') id: string, @Body() body: ProcessReferralWithdrawalDto) {
    return this.service.approveWithdrawal(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Put('withdrawals/:id/reject')
  @AdminPermission('referrals.edit')
  rejectWithdrawal(@Param('id') id: string, @Body() body: ProcessReferralWithdrawalDto) {
    return this.service.rejectWithdrawal(id, body);
  }
}
