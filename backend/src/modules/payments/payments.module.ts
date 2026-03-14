import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsProcessor } from './payments.processor';
import { PaymentsReconcileService } from './payments.reconcile.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'payment' }), AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsProcessor, PaymentsReconcileService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
