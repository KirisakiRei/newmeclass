import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisbursementsModule } from '../disbursements/disbursements.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [AuthModule, DisbursementsModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
})
export class ReferralsModule {}
