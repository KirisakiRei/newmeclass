import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisbursementsModule } from '../disbursements/disbursements.module';
import { MitraController } from './mitra.controller';

@Module({ imports: [AuthModule, DisbursementsModule], controllers: [MitraController] })
export class MitraModule {}
