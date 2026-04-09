import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { MIN_PREMIUM_PRICE } from '../../common/settings/finance-settings';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { PaymentsOpsService } from './payments-ops.service';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ApproveProofDto } from './dto/approve-proof.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly paymentsOpsService: PaymentsOpsService,
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
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
  async approve(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: ApproveProofDto) {
    const before = await this.prisma.manualPaymentProof.findUnique({ where: { id } });
    const updated = await this.service.approveManualProof(id, body.status || 'approved', body.rejectionReason);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_PAYMENT_PROOF_REVIEWED',
      category: 'approval',
      targetType: 'payment_proof',
      targetId: id,
      targetLabel: before?.paymentOrderId || id,
      summary: `Bukti pembayaran ${id} direview dengan status ${body.status || 'approved'}.`,
      before: before ? {
        status: before.status,
        amount: before.amount,
      } : null,
      after: updated ? {
        status: updated.status,
        amount: updated.amount,
      } : {
        status: body.status || 'approved',
      },
      meta: {
        decision: body.status || 'approved',
        reason: body.rejectionReason || null,
      },
      ipAddress: req?.ip,
    });
    return updated;
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
  async acknowledgeAlert(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    const updated = await this.paymentsOpsService.acknowledgeAlert(id, user?.sub || user?.username || 'system');
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_PAYMENT_OPS_ALERT_ACKNOWLEDGED',
      category: 'finance',
      targetType: 'payment_ops_alert',
      targetId: id,
      targetLabel: updated?.title || id,
      summary: `Alert payment ops ${updated?.title || id} diakui.`,
      after: {
        status: updated?.status,
        title: updated?.title,
        severity: updated?.severity,
      },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Post('ops/webhooks/:id/replay')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('payment_ops.manage')
  async replayWebhook(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    const result = await this.paymentsOpsService.replayWebhook(id, user?.sub || user?.username || 'system');
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_PAYMENT_OPS_WEBHOOK_REPLAYED',
      category: 'finance',
      targetType: 'payment_ops_webhook',
      targetId: id,
      targetLabel: result?.orderId || id,
      summary: `Webhook payment ops ${id} direplay.`,
      meta: {
        orderId: result?.orderId || null,
        jobId: result?.jobId || null,
      },
      ipAddress: req?.ip,
    });
    return result;
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
