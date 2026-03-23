import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsOpsService } from '../payments/payments-ops.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsOpsService: PaymentsOpsService,
    @InjectQueue('payment') private readonly paymentQueue: Queue,
  ) {}

  async getHealth() {
    const timestamp = new Date().toISOString();
    let database: Record<string, any> = { ok: false };
    let redis: Record<string, any> = { ok: false };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = { ok: true };
    } catch (error: any) {
      database = { ok: false, error: error?.message || 'database_unreachable' };
    }

    try {
      const client = await this.paymentQueue.client;
      const pong = await client.ping();
      const counts = await this.paymentQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      redis = {
        ok: pong === 'PONG',
        ping: pong,
        queue: counts,
      };
    } catch (error: any) {
      redis = { ok: false, error: error?.message || 'redis_unreachable' };
    }

    let paymentOps: Record<string, any> = { ok: false };
    try {
      const summary = await this.paymentsOpsService.getOpsSummary();
      paymentOps = {
        ok: true,
        queueBacklog: summary.queueBacklog,
        failedJobs: summary.failedJobs,
        stalePendingPayments: summary.stalePendingPayments,
        openAlerts: summary.openAlerts,
        avgProcessingLatencyMs: summary.avgProcessingLatencyMs,
        p95ProcessingLatencyMs: summary.p95ProcessingLatencyMs,
      };
    } catch (error: any) {
      paymentOps = { ok: false, error: error?.message || 'payment_ops_unavailable' };
    }

    return {
      status: database.ok && redis.ok ? 'ok' : 'degraded',
      timestamp,
      database,
      redis,
      paymentOps,
    };
  }
}
