import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('running-info')
export class RunningInfoController {
  private readonly settingsKey = 'runningInfoSettings';

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  private getDefaultSettings() {
    return {
      enabled: true,
      durationSeconds: 28,
    };
  }

  private normalizeSettings(value: any) {
    const nextEnabled = value?.enabled === undefined
      ? this.getDefaultSettings().enabled
      : Boolean(value.enabled);
    const rawDuration = Number(value?.durationSeconds);
    const durationSeconds = Number.isFinite(rawDuration)
      ? Math.min(120, Math.max(10, Math.round(rawDuration)))
      : this.getDefaultSettings().durationSeconds;

    return {
      enabled: nextEnabled,
      durationSeconds,
    };
  }

  private async getSettings() {
    const row = await this.prisma.setting.findUnique({ where: { key: this.settingsKey } });
    return this.normalizeSettings(row?.value);
  }

  @Get()
  async getActive(@Query('isActive') isActive: string) {
    const settings = await this.getSettings();
    if (isActive === 'false') {
      const items = await this.prisma.runningInfo.findMany({ where: { isActive: false }, orderBy: { createdAt: 'desc' } });
      return { items, settings };
    }
    const items = await this.prisma.runningInfo.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    return { items, settings };
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.view')
  getAll() {
    return this.prisma.runningInfo.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.view')
  getSettingsAdmin() {
    return this.getSettings();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  async create(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.prisma.runningInfo.create({
      data: {
        message: String(body?.message || '').trim(),
        isActive: body?.isActive ?? true,
        linkText: body?.linkText ? String(body.linkText).trim() : null,
        linkUrl: body?.linkUrl ? String(body.linkUrl).trim() : null,
      },
    });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_RUNNING_INFO_CREATED',
      category: 'settings',
      targetType: 'running_info',
      targetId: created.id,
      targetLabel: created.message,
      summary: 'Running text baru dibuat.',
      after: {
        message: created.message,
        isActive: created.isActive,
        linkText: created.linkText,
        linkUrl: created.linkUrl,
      },
      ipAddress: req?.ip,
    });
    return created;
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  async updateSettings(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const hasSupportedField = body?.enabled !== undefined || body?.durationSeconds !== undefined;
    if (!hasSupportedField) {
      throw new BadRequestException('Running text settings payload is empty');
    }

    const current = await this.getSettings();
    const value = this.normalizeSettings({
      ...current,
      ...(body || {}),
    });

    await this.prisma.setting.upsert({
      where: { key: this.settingsKey },
      create: { key: this.settingsKey, value },
      update: { value },
    });

    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_RUNNING_INFO_SETTINGS_UPDATED',
      category: 'settings',
      targetType: 'running_info',
      targetId: this.settingsKey,
      targetLabel: 'Pengaturan Running Text',
      summary: 'Pengaturan running text diperbarui.',
      before: current as any,
      after: value as any,
      ipAddress: req?.ip,
    });
    return value;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = await this.prisma.runningInfo.findUnique({ where: { id } });
    const updated = await this.prisma.runningInfo.update({
      where: { id },
      data: {
        ...(body?.message !== undefined ? { message: String(body.message || '').trim() } : {}),
        ...(body?.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body?.linkText !== undefined ? { linkText: body.linkText ? String(body.linkText).trim() : null } : {}),
        ...(body?.linkUrl !== undefined ? { linkUrl: body.linkUrl ? String(body.linkUrl).trim() : null } : {}),
      },
    });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_RUNNING_INFO_UPDATED',
      category: 'settings',
      targetType: 'running_info',
      targetId: id,
      targetLabel: updated.message,
      summary: 'Running text diperbarui.',
      before: before ? {
        message: before.message,
        isActive: before.isActive,
        linkText: before.linkText,
        linkUrl: before.linkUrl,
      } : null,
      after: {
        message: updated.message,
        isActive: updated.isActive,
        linkText: updated.linkText,
        linkUrl: updated.linkUrl,
      },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  async remove(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.prisma.runningInfo.findUnique({ where: { id } });
    await this.prisma.runningInfo.delete({ where: { id } });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_RUNNING_INFO_DELETED',
      category: 'settings',
      targetType: 'running_info',
      targetId: id,
      targetLabel: before?.message || id,
      summary: 'Running text dihapus.',
      before: before ? {
        message: before.message,
        isActive: before.isActive,
        linkText: before.linkText,
        linkUrl: before.linkUrl,
      } : null,
      ipAddress: req?.ip,
    });
    return { message: 'Deleted' };
  }
}
