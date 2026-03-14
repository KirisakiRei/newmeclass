import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MitraController } from './mitra.controller';

@Module({ imports: [AuthModule], controllers: [MitraController] })
export class MitraModule {}
