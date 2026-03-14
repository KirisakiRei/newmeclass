import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('revenue')
  async revenue(@Query('period') _period?: string) {
    const rows = await this.prisma.revenueLedger.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    const total = rows.reduce((acc, r) => acc + r.amount, 0);
    const newme = rows.reduce((acc, r) => acc + r.newmeShare, 0);
    return { totalRevenue: total, newmeShare: newme, count: rows.length };
  }

  @Get('transactions')
  async transactions() {
    return this.prisma.paymentOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
  }

  @Get('disbursements')
  disbursements(@Query('status') status?: string) {
    return this.prisma.disbursement.findMany({ where: status ? { status: status as any } : {}, orderBy: { createdAt: 'desc' } });
  }

  @Put('disbursements/:id/process')
  async processDisbursement(@Param('id') id: string, @Body() body: any) {
    return this.prisma.disbursement.update({
      where: { id },
      data: {
        status: body.status || 'APPROVED',
        notes: body.notes,
        processedAt: new Date(),
      },
    });
  }

  @Post('disbursements/developer')
  createDeveloperDisbursement(@Body() body: any) {
    return this.prisma.disbursement.create({
      data: {
        type: 'developer',
        amount: Number(body.amount || 0),
        status: 'PENDING',
        notes: body.notes || '',
      },
    });
  }
}
