import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
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
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Put('settings')
  @AdminPermission('referrals.edit')
  updateSettings(@Body() body: UpdateReferralSettingsDto) {
    return this.service.updateSettings(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('leaderboard')
  @AdminPermission('referrals.view')
  leaderboard(@Query('limit') limit = '20') {
    return this.service.leaderboard(Number(limit));
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('transactions')
  @AdminPermission('referrals.view')
  transactions(@Query() query: ReferralTransactionsQueryDto) {
    return this.service.transactions(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('stats')
  @AdminPermission('referrals.view')
  stats() {
    return this.service.stats();
  }
}
