import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminManagementController } from './admin-management.controller';
import { AdminManagementService } from './admin-management.service';
import { AdminCompatController } from './admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminCompatController, AdminManagementController],
  providers: [AdminManagementService],
})
export class AdminModule {}
