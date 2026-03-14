import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsReconcileService {
  private readonly logger = new Logger(PaymentsReconcileService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron(process.env.PAYMENT_RECONCILE_CRON || '*/5 * * * *')
  async reconcile() {
    const windowMinutes = Number(process.env.PAYMENT_RECONCILE_WINDOW_MINUTES || 120);
    const result = await this.paymentsService.reconcilePending(windowMinutes);
    this.logger.log(`Payment reconcile checked=${result.checked} fixed=${result.fixed}`);
  }
}
