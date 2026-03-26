import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { MIN_PREMIUM_PRICE } from '../../common/settings/finance-settings';
import { PaymentsService } from './payments.service';
import { PaymentsOpsService } from './payments-ops.service';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ApproveProofDto } from './dto/approve-proof.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly paymentsOpsService: PaymentsOpsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-proof')
  uploadProof(@CurrentUser() user: any, @Body() body: UploadProofDto) {
    return this.service.uploadManualProof({
      userId: user.sub,
      amount: Number(body.paymentAmount || MIN_PREMIUM_PRICE),
      method: body.paymentMethod || 'Transfer Bank',
      fileUrl: body.fileUrl || (body.file ? `/uploads/proof-${Date.now()}.png` : '/uploads/proof.png'),
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payments.view')
  getAll() {
    return this.service.listPayments();
  }

  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payments.view')
  stats() {
    return this.service.paymentStats();
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payments.manage')
  approve(@Param('id') id: string, @Body() body: ApproveProofDto) {
    return this.service.approveManualProof(id, body.status || 'approved', body.rejectionReason);
  }

  @Get('registration/:registrationId')
  registration(@Param('registrationId') registrationId: string) {
    return { data: [], registrationId };
  }

  @Get('ops/summary')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payment_ops.view')
  opsSummary() {
    return this.paymentsOpsService.getOpsSummary();
  }

  @Get('ops/webhooks')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payment_ops.view')
  opsWebhooks(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsOpsService.listWebhooks({
      status,
      search,
      provider,
      page,
      pageSize,
      limit: Number(limit || 50),
    });
  }

  @Get('ops/alerts')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payment_ops.view')
  opsAlerts(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsOpsService.listAlerts({
      severity,
      status,
      search,
      page,
      pageSize,
      limit: Number(limit || 50),
    });
  }

  @Post('ops/alerts/:id/acknowledge')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payment_ops.manage')
  acknowledgeAlert(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsOpsService.acknowledgeAlert(id, user?.sub || user?.username || 'system');
  }

  @Post('ops/webhooks/:id/replay')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payment_ops.manage')
  replayWebhook(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentsOpsService.replayWebhook(id, user?.sub || user?.username || 'system');
  }

  @Post('midtrans/webhook')
  @SkipThrottle()
  async webhook(@Body() payload: any, @Headers() headers: any, @Req() req: any) {
    const startedAt = Date.now();
    const missingFields = this.paymentsOpsService.validateMidtransWebhookPayload(payload);
    const meta = {
      sourceIp: req?.headers?.['x-forwarded-for'] || req?.ip || req?.socket?.remoteAddress || null,
      userAgent: headers?.['user-agent'] || null,
      requestStartedAt: startedAt,
    };

    if (missingFields.length) {
      await this.paymentsOpsService.saveInvalidWebhookAttempt(payload, meta, `missing_fields:${missingFields.join(',')}`);
      throw new BadRequestException(`missing required fields: ${missingFields.join(', ')}`);
    }

    if (!this.service.verifyMidtransSignature(payload)) {
      await this.paymentsOpsService.saveInvalidWebhookAttempt(payload, meta, 'invalid_signature');
      throw new ForbiddenException('invalid signature');
    }

    const inbox = await this.paymentsOpsService.saveWebhookInbox(payload, meta);
    if (!inbox.inserted) {
      return { success: true, message: 'duplicate webhook ignored' };
    }

    const orderId = payload.order_id || payload.orderId;
    const nextStatus = this.service.mapMidtransStatus(payload.transaction_status, payload.fraud_status);

    await this.paymentsOpsService.enqueueWebhookProcessing({
      inboxId: inbox.row.id,
      eventKey: inbox.row.eventKey,
      orderId,
      nextStatus,
      payload,
      source: 'webhook.midtrans',
    });

    return { success: true, message: 'accepted' };
  }

  @Post('reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payment_ops.manage')
  reconcile(@Query('windowMinutes') windowMinutes = '120') {
    return this.service.reconcilePending(Number(windowMinutes));
  }
}
