import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentsService } from './payments.service';
import { PaymentsOpsService } from './payments-ops.service';

const PAYMENT_QUEUE_CONCURRENCY = Number(process.env.PAYMENT_QUEUE_CONCURRENCY || 25);

@Processor('payment', { concurrency: PAYMENT_QUEUE_CONCURRENCY })
export class PaymentsProcessor extends WorkerHost {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentsOpsService: PaymentsOpsService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    if (job.name === 'payment.apply-status') {
      try {
        if (job.data.webhookInboxId) {
          await this.paymentsOpsService.markWebhookProcessingStarted(job.data.webhookInboxId, String(job.id || ''));
        }
        const result = await this.paymentsService.applyOrderTransition(
          job.data.orderId,
          job.data.nextStatus,
          job.data.source || 'queue',
          job.data.payload,
        );
        if (job.data.webhookInboxId) {
          await this.paymentsOpsService.markWebhookProcessingCompleted(job.data.webhookInboxId, result);
        }
        return result;
      } catch (error) {
        if (job.data.webhookInboxId) {
          await this.paymentsOpsService.markWebhookProcessingFailed(job.data.webhookInboxId, error);
        }
        throw error;
      }
    }
    return null;
  }
}
