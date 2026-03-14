import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { UserPaymentsController } from './user-payments.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({ imports: [AuthModule, PaymentsModule, SettingsModule], controllers: [UserPaymentsController] })
export class UserPaymentsModule {}
