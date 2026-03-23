import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisbursementsModule } from '../disbursements/disbursements.module';
import { YayasanController } from './yayasan.controller';

@Module({ imports: [AuthModule, DisbursementsModule], controllers: [YayasanController] })
export class YayasanModule {}
