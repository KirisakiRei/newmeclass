import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { YayasanController } from './yayasan.controller';

@Module({ imports: [AuthModule], controllers: [YayasanController] })
export class YayasanModule {}
