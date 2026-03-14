import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminCompatController } from './admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminCompatController],
})
export class AdminModule {}
