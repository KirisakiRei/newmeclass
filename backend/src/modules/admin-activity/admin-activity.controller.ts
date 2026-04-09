import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { AdminActivityLogService } from './admin-activity.service';

@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
export class AdminActivityLogController {
  constructor(private readonly adminActivityLogService: AdminActivityLogService) {}

  @Get()
  @AdminPermission('activity_logs.view')
  list(@Query() query: ActivityLogQueryDto) {
    return this.adminActivityLogService.list(query);
  }

  @Get(':id')
  @AdminPermission('activity_logs.view')
  getDetail(@Param('id') id: string) {
    return this.adminActivityLogService.getDetail(id);
  }
}
