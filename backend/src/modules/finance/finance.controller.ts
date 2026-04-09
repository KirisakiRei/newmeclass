import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get('revenue')
  @AdminPermission('revenue.view')
  revenue(@Query('period') period?: string) {
    return this.financeService.getRevenueSummary(period);
  }

  @Get('transactions')
  @AdminPermission('transactions.view', 'revenue.view')
  transactions(
    @Query('period') period?: string,
    @Query('jalur') jalur?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listTransactions({ period, jalur, status, search, page, pageSize });
  }

  @Get('disbursements')
  @AdminPermission('transactions.view', 'yayasan_withdrawals.view', 'mitra_withdrawals.view')
  disbursements(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listDisbursements({ type, status, search, page, pageSize });
  }

  @Put('disbursements/:id/process')
  @AdminPermission('transactions.manage', 'yayasan_withdrawals.manage', 'mitra_withdrawals.manage')
  async processDisbursement(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = await this.prisma.disbursement.findUnique({ where: { id } });
    const updated = await this.financeService.processDisbursement(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_FINANCE_DISBURSEMENT_PROCESSED',
      category: 'finance',
      targetType: 'disbursement',
      targetId: id,
      targetLabel: before?.userId || id,
      summary: `Disbursement ${id} diproses ke status ${updated?.status || body?.status || '-'}.`,
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
        type: before?.type || body?.type || null,
      },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Post('disbursements/developer')
  @AdminPermission('revenue.manage')
  async createDeveloperDisbursement(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.financeService.createDeveloperDisbursement(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_FINANCE_DEVELOPER_DISBURSEMENT_CREATED',
      category: 'finance',
      targetType: 'disbursement',
      targetId: created?.id || null,
      targetLabel: 'Developer',
      summary: `Disbursement developer baru dibuat senilai ${body?.amount || 0}.`,
      after: created ? {
        amount: body?.amount || 0,
        status: created.status,
        note: created.notes,
      } : {
        amount: body?.amount || 0,
      },
      ipAddress: req?.ip,
    });
    return created;
  }
}
