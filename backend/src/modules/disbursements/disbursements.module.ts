import { Module } from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';

@Module({
  providers: [DisbursementsService],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
