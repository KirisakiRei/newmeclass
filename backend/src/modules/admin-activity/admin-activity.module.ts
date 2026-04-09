import { Global, Module } from '@nestjs/common';
import { AdminRbacModule } from '../admin-rbac/admin-rbac.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminActivityLogController } from './admin-activity.controller';
import { AdminActivityLogService } from './admin-activity.service';

@Global()
@Module({
  imports: [PrismaModule, AdminRbacModule],
  controllers: [AdminActivityLogController],
  providers: [AdminActivityLogService],
  exports: [AdminActivityLogService],
})
export class AdminActivityLogModule {}
