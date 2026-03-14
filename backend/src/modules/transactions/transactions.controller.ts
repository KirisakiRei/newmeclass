import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  async create(@Body() body: CreateTransactionDto) {
    const order = await this.paymentsService.createOrder({
      userId: body.userId,
      amount: Number(body.amount),
      paymentType: 'TEST_PAYMENT',
      metadata: body,
      idempotencyKey: body.idempotencyKey,
    });

    return { orderId: order.orderId, paymentUrl: order.paymentUrl };
  }

  @Get(':orderId/status')
  async status(@Param('orderId') orderId: string) {
    const row = await this.paymentsService.getOrderByOrderId(orderId);
    return { status: row?.status?.toLowerCase() || 'pending' };
  }

  @Get()
  async all(@Query() query: any) {
    const rows = await this.paymentsService.listOrders({ status: query.status, userId: query.userId });
    return { data: rows, total: rows.length };
  }

  @Get('stats/summary')
  async stats() {
    const stats = await this.paymentsService.paymentStats();
    return { total: stats.total, revenue: stats.totalRevenue };
  }
}
