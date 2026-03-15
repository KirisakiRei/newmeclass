import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('revenue')
  revenue(@Query('period') period?: string) {
    return this.financeService.getRevenueSummary(period);
  }

  @Get('transactions')
  transactions(
    @Query('period') period?: string,
    @Query('jalur') jalur?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.financeService.listTransactions({ period, jalur, status, search });
  }

  @Get('disbursements')
  disbursements(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.financeService.listDisbursements({ type, status, search });
  }

  @Put('disbursements/:id/process')
  processDisbursement(@Param('id') id: string, @Body() body: any) {
    return this.financeService.processDisbursement(id, body);
  }

  @Post('disbursements/developer')
  createDeveloperDisbursement(@Body() body: any) {
    return this.financeService.createDeveloperDisbursement(body);
  }
}
