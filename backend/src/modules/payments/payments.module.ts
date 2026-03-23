import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsOpsService } from './payments-ops.service';
import { PaymentsOpsMonitorService } from './payments-ops-monitor.service';
import { PaymentsProcessor } from './payments.processor';
import { PaymentsReconcileService } from './payments.reconcile.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'payment' }), AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsOpsService, PaymentsProcessor, PaymentsReconcileService, PaymentsOpsMonitorService],
  exports: [PaymentsService, PaymentsOpsService],
})
export class PaymentsModule {}
