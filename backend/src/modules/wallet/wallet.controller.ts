import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import { TopupDto } from './dto/topup.dto';
import { PayTestWithWalletDto } from './dto/pay-test-with-wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('balance/:userId')
  balance(@CurrentUser() user: any, @Param('userId') userId: string) {
    if (user.sub !== userId && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return this.paymentsService.walletBalance(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/:userId')
  async transactions(@CurrentUser() user: any, @Param('userId') userId: string) {
    if (user.sub !== userId && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    const rows = await this.paymentsService.walletTransactions(userId);
    return rows.map((row) => ({
      ...row,
      _id: row.id,
      type: row.entryType === 'CREDIT' ? 'topup' : 'payment',
      status: 'success',
      description: row.note || (row.entryType === 'CREDIT' ? 'Top Up Wallet' : 'Pembayaran'),
      amount: row.entryType === 'CREDIT' ? row.amount : -row.amount,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('topup')
  async topup(@CurrentUser() user: any, @Body() body: TopupDto) {
    const order = await this.paymentsService.createOrder({
      userId: user.sub,
      amount: Number(body.amount),
      paymentType: 'TOPUP',
      idempotencyKey: body.idempotencyKey,
      metadata: { source: 'wallet.topup' },
    });

    return {
      orderId: order.orderId,
      amount: order.amount,
      qrCode: order.qrisUrl,
      qrisUrl: order.qrisUrl,
      status: order.status.toLowerCase(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-status/:orderId')
  async checkStatus(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    const row = await this.paymentsService.getOrderByOrderId(orderId);
    if (row?.userId && row.userId !== user.sub && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return { status: (row?.status || 'PENDING').toLowerCase() };
  }

  @UseGuards(JwtAuthGuard)
  @Post('pay-test')
  payTest(@CurrentUser() user: any, @Body() body: PayTestWithWalletDto) {
    return this.paymentsService.payTestWithWallet(user.sub, Number(body.amount || 0), body.description);
  }
}
