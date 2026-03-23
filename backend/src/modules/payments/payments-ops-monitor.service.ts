import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsOpsService } from './payments-ops.service';

@Injectable()
export class PaymentsOpsMonitorService {
  private readonly logger = new Logger(PaymentsOpsMonitorService.name);
  private lastSnapshotKey = '';

  constructor(private readonly paymentsOpsService: PaymentsOpsService) {}

  @Cron(process.env.PAYMENT_OPS_MONITOR_CRON || '*/1 * * * *')
  async monitor() {
    const result = await this.paymentsOpsService.scanAndSyncAlerts();
    const backlog = Number(result.queueCounts.waiting || 0) + Number(result.queueCounts.active || 0) + Number(result.queueCounts.delayed || 0);
    const snapshot = {
      invalidRequests: result.invalidWindow.invalid,
      queueBacklog: backlog,
      staleOrders: result.stalePending,
      reconcileFixes: result.recentReconcileFixes,
      failedWebhooks: result.failedWebhooks,
      errorRate: result.errorRate,
    };
    const snapshotKey = JSON.stringify(snapshot);
    if (snapshotKey === this.lastSnapshotKey) {
      return;
    }
    this.lastSnapshotKey = snapshotKey;
    this.logger.log(
      `Payment ops snapshot invalidRequests=${snapshot.invalidRequests} queueBacklog=${snapshot.queueBacklog} staleOrders=${snapshot.staleOrders} reconcileFixes=${snapshot.reconcileFixes} failedWebhooks=${snapshot.failedWebhooks} errorRate=${snapshot.errorRate}%`,
    );
  }
}
