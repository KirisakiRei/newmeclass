import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionsController } from './transactions.controller';

@Module({ imports: [PaymentsModule], controllers: [TransactionsController] })
export class TransactionsModule {}
