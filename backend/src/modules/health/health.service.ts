import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
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

    return {
      status: database.ok && redis.ok ? 'ok' : 'degraded',
      timestamp,
      database,
      redis,
    };
  }
}
