import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { PaymentOpsAlertSeverity, PaymentOpsAlertStatus, PaymentStatus, Prisma, WebhookProcessingStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { hostname } from 'os';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

type WebhookRequestMeta = {
  sourceIp?: string | null;
  userAgent?: string | null;
  requestStartedAt?: number;
};

type AlertPayload = {
  alertKey: string;
  type: string;
  severity: PaymentOpsAlertSeverity;
  title: string;
  message: string;
  orderId?: string | null;
  webhookInboxId?: string | null;
  metadata?: Record<string, any> | null;
};

@Injectable()
export class PaymentsOpsService {
  private readonly logger = new Logger(PaymentsOpsService.name);
  private readonly workerId = `payment-processor@${hostname()}`;
  private readonly ignoredTransitionReasons = new Set([
    'stale_transition',
    'preserve_settlement',
    'inconclusive_status_check',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    @InjectQueue('payment') private readonly paymentQueue: Queue,
  ) {}

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private getNow() {
    return new Date();
  }

  private getNumberEnv(name: string, fallback: number) {
    const raw = Number(process.env[name] || fallback);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }

  private getWebhookAlertWindowMs() {
    return this.getNumberEnv('PAYMENT_ALERT_STALE_MINUTES', 5) * 60 * 1000;
  }

  private getWebhookDuplicateCount(row?: { duplicateCount?: number | null }) {
    return Number(row?.duplicateCount || 0);
  }

  private getOrderId(payload: any) {
    const orderId = payload?.order_id || payload?.orderId || null;
    return typeof orderId === 'string' && orderId.trim().length > 0 ? orderId.trim() : null;
  }

  private getTransactionId(payload: any) {
    const transactionId = payload?.transaction_id || payload?.transactionId || null;
    return typeof transactionId === 'string' && transactionId.trim().length > 0 ? transactionId.trim() : null;
  }

  private getEventType(payload: any) {
    const eventType = payload?.transaction_status || payload?.transactionStatus || payload?.status_message || payload?.statusMessage || null;
    return typeof eventType === 'string' && eventType.trim().length > 0 ? eventType.trim() : null;
  }

  private getSignatureKey(payload: any) {
    const signatureKey = payload?.signature_key || payload?.signatureKey || '';
    return typeof signatureKey === 'string' ? signatureKey : '';
  }

  private buildRequestLatencyMs(startedAt?: number) {
    if (!startedAt || !Number.isFinite(startedAt)) {
      return null;
    }
    return Math.max(Date.now() - startedAt, 0);
  }

  private buildEventKey(payload: any, reason?: string) {
    return this.hash(JSON.stringify({
      provider: 'midtrans',
      orderId: this.getOrderId(payload),
      transactionId: this.getTransactionId(payload),
      transactionStatus: payload?.transaction_status || payload?.transactionStatus || null,
      fraudStatus: payload?.fraud_status || payload?.fraudStatus || null,
      signatureKey: this.getSignatureKey(payload),
      reason: reason || null,
    }));
  }

  private getMissingRequiredWebhookFields(payload: any) {
    const checks = [
      { name: 'order_id', present: !!this.getOrderId(payload) },
      { name: 'transaction_status', present: !!(payload?.transaction_status || payload?.transactionStatus) },
      { name: 'status_code', present: !!(payload?.status_code || payload?.statusCode) },
      { name: 'gross_amount', present: !!(payload?.gross_amount || payload?.grossAmount) },
    ];
    return checks.filter((item) => !item.present).map((item) => item.name);
  }

  private getQueueOptions(jobId: string) {
    const safeJobId = String(jobId).replace(/[:]/g, '-');
    return {
      jobId: safeJobId,
      attempts: this.getNumberEnv('PAYMENT_QUEUE_ATTEMPTS', 5),
      backoff: {
        type: 'exponential' as const,
        delay: this.getNumberEnv('PAYMENT_QUEUE_BACKOFF_MS', 5000),
      },
      removeOnComplete: {
        age: this.getNumberEnv('PAYMENT_QUEUE_KEEP_COMPLETED_SECONDS', 86400),
        count: this.getNumberEnv('PAYMENT_QUEUE_KEEP_COMPLETED_COUNT', 500),
      },
      removeOnFail: {
        age: this.getNumberEnv('PAYMENT_QUEUE_KEEP_FAILED_SECONDS', 604800),
        count: this.getNumberEnv('PAYMENT_QUEUE_KEEP_FAILED_COUNT', 1000),
      },
    };
  }

  private classifyCompletion(result: any) {
    if (!result) {
      return { processingStatus: WebhookProcessingStatus.FAILED, lastError: 'empty_transition_result' };
    }
    if (result.applied) {
      return { processingStatus: WebhookProcessingStatus.PROCESSED, lastError: null };
    }
    if (this.ignoredTransitionReasons.has(String(result.reason || ''))) {
      return { processingStatus: WebhookProcessingStatus.IGNORED, lastError: String(result.reason || 'ignored_transition') };
    }
    return { processingStatus: WebhookProcessingStatus.FAILED, lastError: String(result.reason || 'failed_transition') };
  }

  private async loadLatencyStats(from: Date) {
    const rows = await this.prisma.webhookInbox.findMany({
      where: {
        processingStatus: { in: [WebhookProcessingStatus.PROCESSED, WebhookProcessingStatus.IGNORED] },
        receivedAt: { gte: from },
        processingLatencyMs: { not: null },
      },
      select: { processingLatencyMs: true },
      orderBy: { receivedAt: 'desc' },
      take: 1000,
    });
    const latencies = rows.map((row) => Number(row.processingLatencyMs || 0)).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (!latencies.length) return { avg: 0, p95: 0 };
    const total = latencies.reduce((sum, value) => sum + value, 0);
    const avg = Math.round(total / latencies.length);
    const p95Index = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
    return { avg, p95: latencies[p95Index] || latencies[latencies.length - 1] || 0 };
  }

  private async countWebhookWindow(from: Date) {
    const [aggregate, invalidAggregate, processedCount] = await Promise.all([
      this.prisma.webhookInbox.aggregate({
        where: { receivedAt: { gte: from } },
        _count: { _all: true },
        _sum: { duplicateCount: true },
      }),
      this.prisma.webhookInbox.aggregate({
        where: { receivedAt: { gte: from }, processingStatus: WebhookProcessingStatus.INVALID },
        _count: { _all: true },
        _sum: { duplicateCount: true },
      }),
      this.prisma.webhookInbox.count({
        where: {
          receivedAt: { gte: from },
          processingStatus: { in: [WebhookProcessingStatus.PROCESSED, WebhookProcessingStatus.IGNORED] },
        },
      }),
    ]);
    return {
      incoming: Number(aggregate._count._all || 0) + Number(aggregate._sum.duplicateCount || 0),
      invalid: Number(invalidAggregate._count._all || 0) + Number(invalidAggregate._sum.duplicateCount || 0),
      duplicates: Number(aggregate._sum.duplicateCount || 0),
      processed: processedCount,
    };
  }

  private async openOrUpdateAlert(input: AlertPayload) {
    const now = this.getNow();
    const existing = await this.prisma.paymentOpsAlert.findUnique({ where: { alertKey: input.alertKey } });
    if (!existing) {
      const created = await this.prisma.paymentOpsAlert.create({
        data: {
          alertKey: input.alertKey,
          type: input.type,
          severity: input.severity,
          title: input.title,
          message: input.message,
          orderId: input.orderId || null,
          webhookInboxId: input.webhookInboxId || null,
          metadata: input.metadata || undefined,
        },
      });
      this.logger.warn(`Payment ops alert opened key=${created.alertKey} type=${created.type} severity=${created.severity}`);
      return created;
    }
    const reopened = existing.status === PaymentOpsAlertStatus.RESOLVED;
    return this.prisma.paymentOpsAlert.update({
      where: { id: existing.id },
      data: {
        severity: input.severity,
        title: input.title,
        message: input.message,
        orderId: input.orderId || existing.orderId,
        webhookInboxId: input.webhookInboxId || existing.webhookInboxId,
        metadata: input.metadata || existing.metadata || undefined,
        hitCount: { increment: 1 },
        lastTriggeredAt: now,
        status: PaymentOpsAlertStatus.OPEN,
        resolvedAt: null,
        acknowledgedAt: reopened ? null : existing.acknowledgedAt,
        acknowledgedBy: reopened ? null : existing.acknowledgedBy,
      },
    });
  }

  private async resolveAlert(alertKey: string, metadata?: Record<string, any> | null) {
    const existing = await this.prisma.paymentOpsAlert.findUnique({ where: { alertKey } });
    if (!existing || existing.status === PaymentOpsAlertStatus.RESOLVED) {
      return existing;
    }
    const resolved = await this.prisma.paymentOpsAlert.update({
      where: { id: existing.id },
      data: {
        status: PaymentOpsAlertStatus.RESOLVED,
        resolvedAt: this.getNow(),
        metadata: metadata ? { ...((existing.metadata as any) || {}), ...metadata } : existing.metadata || undefined,
      },
    });
    this.logger.log(`Payment ops alert resolved key=${alertKey}`);
    return resolved;
  }

  private async resolveWebhookFailureAlert(webhookInboxId: string, metadata?: Record<string, any> | null) {
    return this.resolveAlert(`webhook_processing_failed:${webhookInboxId}`, metadata);
  }

  private async resolveOrderAlerts(orderId?: string | null) {
    if (!orderId) return;
    await Promise.all([
      this.resolveAlert(`stale_pending_payments:${orderId}`),
      this.resolveAlert(`webhook_processing_failed_by_order:${orderId}`),
    ]);
  }

  private buildSummaryWindow() {
    const now = Date.now();
    return {
      last5m: new Date(now - 5 * 60 * 1000),
      last1h: new Date(now - 60 * 60 * 1000),
      last24h: new Date(now - 24 * 60 * 60 * 1000),
    };
  }

  validateMidtransWebhookPayload(payload: any) {
    return this.getMissingRequiredWebhookFields(payload);
  }

  async saveInvalidWebhookAttempt(payload: any, meta: WebhookRequestMeta, reason: string) {
    const eventKey = this.buildEventKey(payload, reason);
    const requestLatencyMs = this.buildRequestLatencyMs(meta.requestStartedAt);
    const orderId = this.getOrderId(payload);
    try {
      const row = await this.prisma.webhookInbox.create({
        data: {
          eventKey,
          provider: 'midtrans',
          eventType: this.getEventType(payload),
          orderId,
          transactionId: this.getTransactionId(payload),
          signatureKey: this.getSignatureKey(payload),
          sourceIp: meta.sourceIp || null,
          userAgent: meta.userAgent || null,
          processingStatus: WebhookProcessingStatus.INVALID,
          lastError: reason,
          requestLatencyMs,
          payload,
          processedAt: this.getNow(),
        },
      });
      this.logger.warn(
        `Rejected midtrans webhook stored as INVALID order=${orderId || 'unknown'} reason=${reason} action=no_state_change`,
      );
      return { inserted: true, row };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const row = await this.prisma.webhookInbox.update({
          where: { eventKey },
          data: {
            duplicateCount: { increment: 1 },
            lastDuplicateAt: this.getNow(),
            requestLatencyMs,
            sourceIp: meta.sourceIp || undefined,
            userAgent: meta.userAgent || undefined,
            lastError: reason,
          },
        });
        return { inserted: false, row };
      }
      throw error;
    }
  }

  async saveWebhookInbox(payload: any, meta: WebhookRequestMeta) {
    const orderId = this.getOrderId(payload);
    const mappedStatus = this.paymentsService.mapMidtransStatus(
      payload?.transaction_status || payload?.transactionStatus,
      payload?.fraud_status || payload?.fraudStatus,
    );
    const order = orderId
      ? await this.prisma.paymentOrder.findUnique({ where: { orderId }, select: { status: true } })
      : null;
    const requestLatencyMs = this.buildRequestLatencyMs(meta.requestStartedAt);
    const eventKey = this.buildEventKey(payload);

    try {
      const row = await this.prisma.webhookInbox.create({
        data: {
          eventKey,
          provider: 'midtrans',
          eventType: this.getEventType(payload),
          orderId,
          transactionId: this.getTransactionId(payload),
          signatureKey: this.getSignatureKey(payload),
          sourceIp: meta.sourceIp || null,
          userAgent: meta.userAgent || null,
          statusBeforeProcess: order?.status || null,
          nextStatus: mappedStatus,
          requestLatencyMs,
          payload,
        },
      });
      return { inserted: true, row };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const row = await this.prisma.webhookInbox.update({
          where: { eventKey },
          data: {
            duplicateCount: { increment: 1 },
            lastDuplicateAt: this.getNow(),
            requestLatencyMs,
            sourceIp: meta.sourceIp || undefined,
            userAgent: meta.userAgent || undefined,
          },
        });
        return { inserted: false, row };
      }
      throw error;
    }
  }

  async enqueueWebhookProcessing(input: {
    inboxId: string;
    eventKey: string;
    orderId: string;
    nextStatus: PaymentStatus;
    payload: any;
    source: string;
    replay?: boolean;
  }) {
    const jobId = input.replay ? `${input.eventKey}-replay-${Date.now()}` : input.eventKey;
    await this.paymentQueue.add('payment.apply-status', {
      orderId: input.orderId,
      nextStatus: input.nextStatus,
      payload: input.payload,
      source: input.source,
      webhookInboxId: input.inboxId,
    }, this.getQueueOptions(jobId));
    return { queued: true, jobId };
  }

  async markWebhookProcessingStarted(webhookInboxId: string, jobId?: string) {
    const row = await this.prisma.webhookInbox.update({
      where: { id: webhookInboxId },
      data: {
        processingStatus: WebhookProcessingStatus.PROCESSING,
        processAttempts: { increment: 1 },
        lastError: null,
        lastProcessedBy: jobId ? `${this.workerId}:${jobId}` : this.workerId,
      },
      select: { id: true, orderId: true },
    });
    await this.resolveWebhookFailureAlert(webhookInboxId, { replayed: true });
    return row;
  }

  async markWebhookProcessingCompleted(webhookInboxId: string, result: any) {
    const existing = await this.prisma.webhookInbox.findUnique({
      where: { id: webhookInboxId },
      select: { id: true, orderId: true, receivedAt: true },
    });
    if (!existing) return null;

    const classification = this.classifyCompletion(result);
    const processedAt = this.getNow();
    const processingLatencyMs = Math.max(processedAt.getTime() - new Date(existing.receivedAt).getTime(), 0);
    const updated = await this.prisma.webhookInbox.update({
      where: { id: webhookInboxId },
      data: {
        processingStatus: classification.processingStatus,
        lastError: classification.lastError,
        processedAt,
        processingLatencyMs,
        lastProcessedBy: this.workerId,
      },
    });

    if (classification.processingStatus === WebhookProcessingStatus.FAILED) {
      await this.openOrUpdateAlert({
        alertKey: `webhook_processing_failed:${webhookInboxId}`,
        type: 'webhook_processing_failed',
        severity: PaymentOpsAlertSeverity.CRITICAL,
        title: 'Webhook payment gagal diproses',
        message: `Webhook untuk order ${updated.orderId || '-'} gagal diproses: ${classification.lastError}`,
        orderId: updated.orderId,
        webhookInboxId,
        metadata: { reason: classification.lastError },
      });
      if (updated.orderId) {
        await this.openOrUpdateAlert({
          alertKey: `webhook_processing_failed_by_order:${updated.orderId}`,
          type: 'webhook_processing_failed',
          severity: PaymentOpsAlertSeverity.WARNING,
          title: 'Order payment membutuhkan perhatian',
          message: `Order ${updated.orderId} memiliki webhook gagal yang perlu direview atau direplay.`,
          orderId: updated.orderId,
          webhookInboxId,
        });
      }
      return updated;
    }

    await this.resolveWebhookFailureAlert(webhookInboxId, {
      finalStatus: classification.processingStatus,
      transitionStatus: result?.status || null,
    });
    await this.resolveOrderAlerts(updated.orderId);
    return updated;
  }

  async markWebhookProcessingFailed(webhookInboxId: string, error: any) {
    const existing = await this.prisma.webhookInbox.findUnique({
      where: { id: webhookInboxId },
      select: { id: true, orderId: true, receivedAt: true },
    });
    if (!existing) return null;

    const processedAt = this.getNow();
    const processingLatencyMs = Math.max(processedAt.getTime() - new Date(existing.receivedAt).getTime(), 0);
    const lastError = String(error?.message || error || 'unknown_processing_error');
    const updated = await this.prisma.webhookInbox.update({
      where: { id: webhookInboxId },
      data: {
        processingStatus: WebhookProcessingStatus.FAILED,
        lastError,
        processedAt,
        processingLatencyMs,
        lastProcessedBy: this.workerId,
      },
    });

    await this.openOrUpdateAlert({
      alertKey: `webhook_processing_failed:${webhookInboxId}`,
      type: 'webhook_processing_failed',
      severity: PaymentOpsAlertSeverity.CRITICAL,
      title: 'Webhook payment gagal diproses',
      message: `Webhook untuk order ${updated.orderId || '-'} gagal diproses: ${lastError}`,
      orderId: updated.orderId,
      webhookInboxId,
      metadata: { error: lastError },
    });

    if (updated.orderId) {
      await this.openOrUpdateAlert({
        alertKey: `webhook_processing_failed_by_order:${updated.orderId}`,
        type: 'webhook_processing_failed',
        severity: PaymentOpsAlertSeverity.WARNING,
        title: 'Order payment membutuhkan perhatian',
        message: `Order ${updated.orderId} memiliki webhook gagal yang perlu direview atau direplay.`,
        orderId: updated.orderId,
        webhookInboxId,
      });
    }

    return updated;
  }

  async getOpsSummary() {
    const windows = this.buildSummaryWindow();
    const [window5m, window1h, window24h, queueCounts, stalePendingPayments, openAlerts, latencyStats, reconcileFixes] = await Promise.all([
      this.countWebhookWindow(windows.last5m),
      this.countWebhookWindow(windows.last1h),
      this.countWebhookWindow(windows.last24h),
      this.paymentQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.prisma.paymentOrder.count({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: { lte: new Date(Date.now() - this.getWebhookAlertWindowMs()) },
        },
      }),
      this.prisma.paymentOpsAlert.count({
        where: { status: { in: [PaymentOpsAlertStatus.OPEN, PaymentOpsAlertStatus.ACKNOWLEDGED] } },
      }),
      this.loadLatencyStats(windows.last24h),
      this.prisma.paymentEvent.count({
        where: { source: 'midtrans.reconcile', createdAt: { gte: windows.last24h } },
      }),
    ]);

    const queueBacklog = Number(queueCounts.waiting || 0) + Number(queueCounts.active || 0) + Number(queueCounts.delayed || 0);
    return {
      incomingWebhooks: window24h.incoming,
      processedWebhooks: window24h.processed,
      duplicateWebhooks: window24h.duplicates,
      invalidSignatures: window24h.invalid,
      queueBacklog,
      failedJobs: Number(queueCounts.failed || 0),
      stalePendingPayments,
      reconcileFixes,
      avgProcessingLatencyMs: latencyStats.avg,
      p95ProcessingLatencyMs: latencyStats.p95,
      openAlerts,
      windows: { last5m: window5m, last1h: window1h, last24h: window24h },
      queue: queueCounts,
    };
  }

  async listWebhooks(query?: { status?: string; search?: string; provider?: string; page?: string | number; pageSize?: string | number; limit?: number }) {
    const { page, pageSize, skip, take } = resolvePagination(query, {
      pageSize: Number(query?.limit || 20),
      maxPageSize: 200,
    });
    const search = String(query?.search || '').trim();
    const where: Prisma.WebhookInboxWhereInput = {
      provider: query?.provider || undefined,
      processingStatus: query?.status as WebhookProcessingStatus || undefined,
    };

    if (search) {
      where.OR = [
        { orderId: { contains: search } },
        { transactionId: { contains: search } },
        { sourceIp: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.webhookInbox.findMany({ where, orderBy: { receivedAt: 'desc' }, skip, take }),
      this.prisma.webhookInbox.count({ where }),
    ]);

    const orderIds = Array.from(new Set(items.map((item) => item.orderId).filter(Boolean) as string[]));
    const orders = orderIds.length
      ? await this.prisma.paymentOrder.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderId: true, status: true, amount: true, updatedAt: true },
        })
      : [];
    const orderMap = new Map(orders.map((order) => [order.orderId, order]));

    const mappedItems = items.map((item) => {
        const order = item.orderId ? orderMap.get(item.orderId) : null;
        return {
          id: item.id,
          provider: item.provider,
          eventType: item.eventType,
          orderId: item.orderId,
          transactionId: item.transactionId,
          sourceIp: item.sourceIp,
          userAgent: item.userAgent,
          statusBeforeProcess: item.statusBeforeProcess,
          nextStatus: item.nextStatus,
          processingStatus: item.processingStatus,
          processAttempts: item.processAttempts,
          duplicateCount: this.getWebhookDuplicateCount(item),
          lastDuplicateAt: item.lastDuplicateAt,
          lastError: item.lastError,
          lastProcessedBy: item.lastProcessedBy,
          requestLatencyMs: item.requestLatencyMs,
          processingLatencyMs: item.processingLatencyMs,
          receivedAt: item.receivedAt,
          processedAt: item.processedAt,
          createdAt: item.createdAt,
          payload: item.payload,
          order: order ? {
            status: order.status,
            amount: order.amount,
            updatedAt: order.updatedAt,
          } : null,
        };
      });

    return buildPaginatedResult(mappedItems, total, page, pageSize);
  }

  async listAlerts(query?: { severity?: string; status?: string; search?: string; page?: string | number; pageSize?: string | number; limit?: number }) {
    const { page, pageSize, skip, take } = resolvePagination(query, {
      pageSize: Number(query?.limit || 10),
      maxPageSize: 200,
    });
    const search = String(query?.search || '').trim();
    const normalizedStatus = String(query?.status || 'ACTIVE').trim().toUpperCase();
    const where: Prisma.PaymentOpsAlertWhereInput = {
      severity: query?.severity as PaymentOpsAlertSeverity || undefined,
    };

    if (normalizedStatus === 'ACTIVE') {
      where.status = { in: [PaymentOpsAlertStatus.OPEN, PaymentOpsAlertStatus.ACKNOWLEDGED] };
    } else if (normalizedStatus) {
      where.status = normalizedStatus as PaymentOpsAlertStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
        { orderId: { contains: search } },
        { type: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.paymentOpsAlert.findMany({
        where,
        orderBy: [{ status: 'asc' }, { lastTriggeredAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.paymentOpsAlert.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string) {
    const alert = await this.prisma.paymentOpsAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alert tidak ditemukan');

    return this.prisma.paymentOpsAlert.update({
      where: { id },
      data: {
        status: alert.status === PaymentOpsAlertStatus.RESOLVED ? PaymentOpsAlertStatus.RESOLVED : PaymentOpsAlertStatus.ACKNOWLEDGED,
        acknowledgedAt: this.getNow(),
        acknowledgedBy,
      },
    });
  }

  async replayWebhook(id: string, replayedBy: string) {
    const row = await this.prisma.webhookInbox.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Webhook log tidak ditemukan');
    if (!row.orderId) throw new BadRequestException('Webhook ini tidak punya orderId untuk direplay.');
    if (row.processingStatus === WebhookProcessingStatus.INVALID) {
      throw new BadRequestException('Webhook invalid signature tidak bisa direplay.');
    }

    const nextStatus = row.nextStatus
      ? (String(row.nextStatus).toUpperCase() as PaymentStatus)
      : this.paymentsService.mapMidtransStatus((row.payload as any)?.transaction_status, (row.payload as any)?.fraud_status);

    await this.prisma.webhookInbox.update({
      where: { id },
      data: { processingStatus: WebhookProcessingStatus.RECEIVED, lastError: null },
    });

    const eventKey = `${row.eventKey}:manual-replay:${Date.now()}`;
    const queued = await this.enqueueWebhookProcessing({
      inboxId: row.id,
      eventKey,
      orderId: row.orderId,
      nextStatus,
      payload: row.payload,
      source: 'webhook.manual-replay',
      replay: true,
    });

    this.logger.warn(`Webhook replay requested by ${replayedBy} for order=${row.orderId}`);
    return { replayed: true, jobId: queued.jobId, orderId: row.orderId };
  }

  async scanAndSyncAlerts() {
    const staleThreshold = new Date(Date.now() - this.getWebhookAlertWindowMs());
    const invalidThresholdCount = this.getNumberEnv('PAYMENT_ALERT_INVALID_SIGNATURE_THRESHOLD', 5);
    const queueBacklogThreshold = this.getNumberEnv('PAYMENT_ALERT_QUEUE_BACKLOG_THRESHOLD', 50);
    const failedWebhookAttemptThreshold = this.getNumberEnv('PAYMENT_ALERT_FAILED_ATTEMPTS_THRESHOLD', 3);
    const errorRateThreshold = this.getNumberEnv('PAYMENT_ALERT_ERROR_RATE_THRESHOLD_PERCENT', 20);

    const [invalidWindow, queueCounts, stalePendingRows, recentReconcileFixes, failedWebhooks] = await Promise.all([
      this.countWebhookWindow(staleThreshold),
      this.paymentQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.prisma.paymentOrder.findMany({
        where: { status: PaymentStatus.PENDING, createdAt: { lte: staleThreshold } },
        select: { orderId: true, createdAt: true, updatedAt: true },
        take: 20,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.paymentEvent.count({
        where: { source: 'midtrans.reconcile', createdAt: { gte: staleThreshold } },
      }),
      this.prisma.webhookInbox.findMany({
        where: { processingStatus: WebhookProcessingStatus.FAILED, processAttempts: { gte: failedWebhookAttemptThreshold } },
        orderBy: { receivedAt: 'desc' },
        take: 25,
      }),
    ]);

    if (invalidWindow.invalid >= invalidThresholdCount) {
      await this.openOrUpdateAlert({
        alertKey: 'invalid_signature_spike',
        type: 'invalid_signature_spike',
        severity: PaymentOpsAlertSeverity.CRITICAL,
        title: 'Lonjakan invalid signature webhook',
        message: `${invalidWindow.invalid} webhook invalid signature diterima dalam 5 menit terakhir.`,
        metadata: invalidWindow,
      });
    } else {
      await this.resolveAlert('invalid_signature_spike', { invalidWindow });
    }

    const queueBacklog = Number(queueCounts.waiting || 0) + Number(queueCounts.active || 0) + Number(queueCounts.delayed || 0);
    if (queueBacklog >= queueBacklogThreshold) {
      await this.openOrUpdateAlert({
        alertKey: 'payment_queue_backlog',
        type: 'queue_backlog',
        severity: queueBacklog >= queueBacklogThreshold * 2 ? PaymentOpsAlertSeverity.CRITICAL : PaymentOpsAlertSeverity.WARNING,
        title: 'Antrian payment menumpuk',
        message: `Queue payment backlog mencapai ${queueBacklog} job.`,
        metadata: queueCounts as any,
      });
    } else {
      await this.resolveAlert('payment_queue_backlog', queueCounts as any);
    }

    if (stalePendingRows.length > 0) {
      await this.openOrUpdateAlert({
        alertKey: 'stale_pending_payments',
        type: 'stale_pending_payment',
        severity: PaymentOpsAlertSeverity.WARNING,
        title: 'Ada payment pending melebihi SLA',
        message: `${stalePendingRows.length} order masih pending lebih dari 5 menit dan perlu direview.`,
        metadata: {
          count: stalePendingRows.length,
          orderIds: stalePendingRows.map((row) => row.orderId),
        },
      });
    } else {
      await this.resolveAlert('stale_pending_payments', { count: 0 });
    }

    const staleAlerts = await this.prisma.paymentOpsAlert.findMany({
      where: { type: 'stale_pending_payment', status: { in: [PaymentOpsAlertStatus.OPEN, PaymentOpsAlertStatus.ACKNOWLEDGED] } },
      select: { id: true, alertKey: true },
    });
    for (const alert of staleAlerts) {
      if (alert.alertKey !== 'stale_pending_payments') {
        await this.resolveAlert(alert.alertKey);
      }
    }

    if (recentReconcileFixes > 0) {
      await this.openOrUpdateAlert({
        alertKey: 'payment_reconcile_fix_detected',
        type: 'reconcile_fix_detected',
        severity: PaymentOpsAlertSeverity.WARNING,
        title: 'Reconcile payment memperbaiki mismatch',
        message: `${recentReconcileFixes} order diperbaiki oleh reconcile dalam 5 menit terakhir.`,
        metadata: { recentReconcileFixes },
      });
    } else {
      await this.resolveAlert('payment_reconcile_fix_detected', { recentReconcileFixes });
    }

    const failedWebhookKeys = new Set<string>();
    for (const webhook of failedWebhooks) {
      const alertKey = `webhook_processing_failed:${webhook.id}`;
      failedWebhookKeys.add(alertKey);
      await this.openOrUpdateAlert({
        alertKey,
        type: 'webhook_processing_failed',
        severity: PaymentOpsAlertSeverity.CRITICAL,
        title: 'Webhook payment gagal berulang',
        message: `Webhook ${webhook.id} untuk order ${webhook.orderId || '-'} sudah gagal ${webhook.processAttempts} kali.`,
        orderId: webhook.orderId,
        webhookInboxId: webhook.id,
        metadata: { processAttempts: webhook.processAttempts, lastError: webhook.lastError },
      });
    }

    const failedAlerts = await this.prisma.paymentOpsAlert.findMany({
      where: { type: 'webhook_processing_failed', status: { in: [PaymentOpsAlertStatus.OPEN, PaymentOpsAlertStatus.ACKNOWLEDGED] } },
      select: { alertKey: true, webhookInboxId: true },
    });
    for (const alert of failedAlerts) {
      if (alert.webhookInboxId && !failedWebhookKeys.has(alert.alertKey)) {
        await this.resolveAlert(alert.alertKey);
      }
    }

    const errorWindowTotal = Math.max(invalidWindow.incoming, 1);
    const errorWindowCount = invalidWindow.invalid + failedWebhooks.filter((item) => item.receivedAt >= staleThreshold).length;
    const errorRate = Math.round((errorWindowCount / errorWindowTotal) * 100);
    if (errorRate >= errorRateThreshold && errorWindowCount > 0) {
      await this.openOrUpdateAlert({
        alertKey: 'webhook_error_rate_high',
        type: 'webhook_error_rate_high',
        severity: PaymentOpsAlertSeverity.CRITICAL,
        title: 'Error rate webhook tinggi',
        message: `Error rate webhook mencapai ${errorRate}% dalam 5 menit terakhir.`,
        metadata: { errorRate, errorWindowCount, errorWindowTotal },
      });
    } else {
      await this.resolveAlert('webhook_error_rate_high', { errorRate, errorWindowCount, errorWindowTotal });
    }

    return {
      invalidWindow,
      queueCounts,
      stalePending: stalePendingRows.length,
      recentReconcileFixes,
      failedWebhooks: failedWebhooks.length,
      errorRate,
    };
  }
}
