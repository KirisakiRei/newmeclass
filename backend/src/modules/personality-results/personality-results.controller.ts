import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PersonalityResultsService } from './personality-results.service';

@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
@Controller('personality-results')
export class PersonalityResultsController {
  constructor(
    private readonly service: PersonalityResultsService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get()
  @AdminPermission('personality_results.view')
  getAll() { return this.service.getAll(); }

  @Get(':code')
  @AdminPermission('personality_results.view')
  getByCode(@Param('code') code: string) { return this.service.getByCode(code); }

  @Put(':code')
  @AdminPermission('personality_results.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('code') code: string, @Body() body: any) {
    const before = await this.service.getByCode(code).catch(() => null);
    const updated = await this.service.update(code, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_PERSONALITY_RESULT_UPDATED',
      category: 'testing',
      targetType: 'personality_result',
      targetId: code,
      targetLabel: updated?.label || code,
      summary: `Template hasil kepribadian ${code} diperbarui.`,
      before: before ? {
        code: before.code,
        label: before.label,
        socialType: before.socialType,
        element: before.element,
        color: before.color,
      } : null,
      after: {
        code: updated?.code,
        label: updated?.label,
        socialType: updated?.socialType,
        element: updated?.element,
        color: updated?.color,
      },
      ipAddress: req?.ip,
    });
    return updated;
  }
}
