import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import { UploadUserProofDto } from './dto/upload-user-proof.dto';
import { CreateQrisDto } from './dto/create-qris.dto';
import { TestPriceQueryDto } from './dto/test-price-query.dto';

@Controller('user-payments')
export class UserPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-proof')
  uploadProof(@CurrentUser() user: any, @Body() body: UploadUserProofDto) {
    return this.paymentsService.uploadManualProof({
      userId: user.sub,
      amount: Number(body.paymentAmount || 100000),
      method: body.paymentMethod || 'Transfer Bank',
      fileUrl: body.fileUrl || (body.file ? `/uploads/proof-${Date.now()}.png` : '/uploads/proof.png'),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-payments')
  async myPayments(@CurrentUser() user: any) {
    const [proofs, orders] = await Promise.all([
      this.paymentsService.getUserManualProofs(user.sub),
      this.paymentsService.getUserPaymentOrders(user.sub),
    ]);
    return {
      payments: proofs,
      orders: orders.map((order) => ({
        ...order,
        ...this.paymentsService.getSnapSession(order),
      })),
    };
  }

  @Get('test-price')
  async testPrice(@Query() query: TestPriceQueryDto) {
    const pricing = await this.paymentsService.getTestPricing(undefined, query.referralCode || undefined);
    return {
      testPrice: pricing.totalPrice,
      basePrice: pricing.basePrice,
      referralCode: pricing.referralCode,
      referrerRole: pricing.referrerRole,
      approvalStatus: pricing.approvalStatus,
      referralActive: pricing.referralActive,
      yayasanShare: pricing.yayasanShare,
      mitraShare: pricing.mitraShare,
      totalPrice: pricing.totalPrice,
      yayasanReferralCode: pricing.yayasanReferralCode,
      mitraReferralCode: pricing.mitraReferralCode,
      yayasanId: pricing.yayasanId,
      mitraId: pricing.mitraId,
      userReferrerId: pricing.userReferrerId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-qris')
  async createQris(@CurrentUser() user: any, @Body() body: CreateQrisDto) {
    const pricing = await this.paymentsService.getTestPricing(user.sub);
    const pending = await this.paymentsService.getLatestPendingTestPayment(user.sub);
    if (pending) {
      return {
        success: true,
        already_pending: true,
        data: {
          orderId: pending.orderId,
          unique_code: pending.orderId,
          qris_url: pending.qrisUrl,
          amount: pending.amount,
        },
      };
    }

    const order = await this.paymentsService.createOrder({
      userId: user.sub,
      amount: Number(body.amount || pricing.totalPrice || pricing.basePrice || 100000),
      paymentType: 'TEST_PAYMENT',
      idempotencyKey: body.idempotencyKey,
      metadata: { source: 'user-payments.create-qris', pricing },
    });

    return {
      success: true,
      already_pending: false,
      data: {
        orderId: order.orderId,
        unique_code: order.orderId,
        qris_url: order.qrisUrl,
        amount: order.amount,
        pricing,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-snap')
  async createSnap(@CurrentUser() user: any, @Body() body: CreateQrisDto) {
    const pricing = await this.paymentsService.getTestPricing(user.sub);
    const order = await this.paymentsService.createOrReuseSnapOrder({
      userId: user.sub,
      amount: Number(body.amount || pricing.totalPrice || pricing.basePrice || 100000),
      paymentType: 'TEST_PAYMENT',
      idempotencyKey: body.idempotencyKey,
      replacePending: body.replacePending,
      metadata: { source: 'user-payments.create-snap', pricing },
    });

    return {
      success: true,
      already_pending: String(order?.status || '').toUpperCase() === 'PENDING',
      data: {
        ...this.paymentsService.getSnapSession(order),
        status: String(order?.status || '').toLowerCase(),
        pricing,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-payment/:orderId')
  async cancelPayment(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    const row = await this.paymentsService.getOrderByOrderId(orderId);
    if (row?.userId && row.userId !== user.sub && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    const updated = await this.paymentsService.cancelSnapOrder(orderId, {
      allowLocalFallback: true,
      source: 'user.cancel-payment',
    });
    return {
      success: true,
      data: {
        orderId: updated?.orderId || orderId,
        status: String(updated?.status || '').toLowerCase() || 'cancel',
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-qris/:uniqueCode')
  async checkQris(@CurrentUser() user: any, @Param('uniqueCode') uniqueCode: string) {
    const row = await this.paymentsService.getOrderByOrderId(uniqueCode);
    if (row?.userId && row.userId !== user.sub && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    const paid = ['SETTLEMENT', 'CAPTURE', 'SUCCESS'].includes(String(row?.status));
    return { status: row?.status?.toLowerCase() || 'pending', paid, uniqueCode };
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-payment/:orderId')
  async checkPayment(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    const row = await this.paymentsService.getOrderByOrderId(orderId);
    if (row?.userId && row.userId !== user.sub && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    const freshRow = row && ['settlement', 'capture', 'success'].includes(String(row.status).toLowerCase())
      ? row
      : await this.paymentsService.syncOrderStatusFromMidtrans(orderId);
    return { status: freshRow?.status?.toLowerCase() || row?.status?.toLowerCase() || 'pending' };
  }

  @Get('status/:userId')
  @UseGuards(JwtAuthGuard)
  async userStatus(@CurrentUser() user: any, @Param('userId') userId: string) {
    if (user.sub !== userId && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    const paidOrder = await this.paymentsService.getLatestSuccessfulTestPayment(userId);
    const pendingOrder = await this.paymentsService.getLatestPendingTestPayment(userId);
    return { status: paidOrder ? 'paid' : pendingOrder ? 'pending' : 'not_paid', hasPaidAccess: !!paidOrder };
  }
}
