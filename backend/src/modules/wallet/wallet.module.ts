import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { WalletController } from './wallet.controller';

@Module({ imports: [AuthModule, PaymentsModule], controllers: [WalletController] })
export class WalletModule {}
