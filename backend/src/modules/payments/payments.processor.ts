import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentsService } from './payments.service';

@Processor('payment')
export class PaymentsProcessor extends WorkerHost {
  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    if (job.name === 'payment.apply-status') {
      return this.paymentsService.applyOrderTransition(
        job.data.orderId,
        job.data.nextStatus,
        job.data.source || 'queue',
        job.data.payload,
      );
    }
    return null;
  }
}
