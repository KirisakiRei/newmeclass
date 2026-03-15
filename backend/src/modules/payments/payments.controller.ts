import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ApproveProofDto } from './dto/approve-proof.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    @InjectQueue('payment') private readonly paymentQueue: Queue,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-proof')
  uploadProof(@CurrentUser() user: any, @Body() body: UploadProofDto) {
    return this.service.uploadManualProof({
      userId: user.sub,
      amount: Number(body.paymentAmount || 100000),
      method: body.paymentMethod || 'Transfer Bank',
      fileUrl: body.fileUrl || (body.file ? `/uploads/proof-${Date.now()}.png` : '/uploads/proof.png'),
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getAll() {
    return this.service.listPayments();
  }

  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  stats() {
    return this.service.paymentStats();
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  approve(@Param('id') id: string, @Body() body: ApproveProofDto) {
    return this.service.approveManualProof(id, body.status || 'approved', body.rejectionReason);
  }

  @Get('registration/:registrationId')
  registration(@Param('registrationId') registrationId: string) {
    return { data: [], registrationId };
  }

  @Post('midtrans/webhook')
  async webhook(@Body() payload: any, @Headers() _headers: any) {
    if (!this.service.verifyMidtransSignature(payload)) {
      throw new ForbiddenException('invalid signature');
    }

    const inbox = await this.service.saveWebhookInbox(payload);
    if (!inbox.inserted) {
      return { success: true, message: 'duplicate webhook ignored' };
    }

    const orderId = payload.order_id || payload.orderId;
    const nextStatus = this.service.mapMidtransStatus(payload.transaction_status, payload.fraud_status);

    await this.paymentQueue.add('payment.apply-status', {
      orderId,
      nextStatus,
      payload,
      source: 'webhook.midtrans',
    });

    return { success: true, message: 'accepted' };
  }

  @Post('reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  reconcile(@Query('windowMinutes') windowMinutes = '120') {
    return this.service.reconcilePending(Number(windowMinutes));
  }
}
