import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly service: QuestionsService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get('public')
  getPublic() { return this.service.getPublicQuestions(); }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.view')
  getAll() { return this.service.getAll(); }

  @Get('categories/list')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.view')
  categories() { return this.service.getCategories(); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.create')
  async create(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.service.create(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_QUESTION_CREATED',
      category: 'testing',
      targetType: 'question',
      targetId: created?.id || created?._id || null,
      targetLabel: created?.question || created?.text || 'Pertanyaan',
      summary: 'Pertanyaan baru dibuat.',
      after: {
        question: created?.question || created?.text || null,
        category: created?.category || null,
        type: created?.type || null,
        order: created?.order || 0,
      },
      ipAddress: req?.ip,
    });
    return created;
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.manage')
  async reorder(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const result = await this.service.reorder(body.orders || body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_QUESTION_REORDERED',
      category: 'testing',
      targetType: 'question',
      targetId: 'reorder',
      targetLabel: 'Urutan Pertanyaan',
      summary: 'Urutan pertanyaan diperbarui.',
      meta: {
        itemCount: Array.isArray(body?.orders || body) ? (body.orders || body).length : 0,
      },
      ipAddress: req?.ip,
    });
    return result;
  }

  @Post('seed-questions')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.manage')
  async seed(@CurrentUser() user: any, @Req() req: any) {
    const result = await this.service.seedQuestions();
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_QUESTION_SEEDED',
      category: 'testing',
      targetType: 'question',
      targetId: 'seed',
      targetLabel: 'Seed Questions',
      summary: 'Seed pertanyaan dijalankan.',
      meta: result as any,
      ipAddress: req?.ip,
    });
    return result;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.view')
  getById(@Param('id') id: string) { return this.service.getById(id); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = await this.service.getById(id);
    const updated = await this.service.update(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_QUESTION_UPDATED',
      category: 'testing',
      targetType: 'question',
      targetId: id,
      targetLabel: updated?.question || updated?.text || id,
      summary: 'Pertanyaan diperbarui.',
      before: before ? {
        question: before.question || before.text || null,
        category: before.category || null,
        type: before.type || null,
        order: before.order || 0,
      } : null,
      after: updated ? {
        question: updated.question || updated.text || null,
        category: updated.category || null,
        type: updated.type || null,
        order: updated.order || 0,
      } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('questions.delete')
  async remove(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.service.getById(id);
    const result = await this.service.remove(id);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_QUESTION_DELETED',
      category: 'testing',
      targetType: 'question',
      targetId: id,
      targetLabel: before?.question || before?.text || id,
      summary: 'Pertanyaan dihapus.',
      before: before ? {
        question: before.question || before.text || null,
        category: before.category || null,
        type: before.type || null,
        order: before.order || 0,
      } : null,
      ipAddress: req?.ip,
    });
    return result;
  }
}
