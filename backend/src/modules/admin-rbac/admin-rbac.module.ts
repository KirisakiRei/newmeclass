import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminPermissionGuard } from './admin-permission.guard';
import { AdminRbacService } from './admin-rbac.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AdminRbacService, AdminPermissionGuard],
  exports: [AdminRbacService, AdminPermissionGuard],
})
export class AdminRbacModule {}
