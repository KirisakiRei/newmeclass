import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

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
  processDisbursement(@Param('id') id: string, @Body() body: any) {
    return this.financeService.processDisbursement(id, body);
  }

  @Post('disbursements/developer')
  @AdminPermission('revenue.manage')
  createDeveloperDisbursement(@Body() body: any) {
    return this.financeService.createDeveloperDisbursement(body);
  }
}
