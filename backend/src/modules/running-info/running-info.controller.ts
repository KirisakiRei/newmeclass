import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('running-info')
export class RunningInfoController {
  private readonly settingsKey = 'runningInfoSettings';

  constructor(private readonly prisma: PrismaService) {}

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
  create(@Body() body: any) {
    return this.prisma.runningInfo.create({
      data: {
        message: String(body?.message || '').trim(),
        isActive: body?.isActive ?? true,
        linkText: body?.linkText ? String(body.linkText).trim() : null,
        linkUrl: body?.linkUrl ? String(body.linkUrl).trim() : null,
      },
    });
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  async updateSettings(@Body() body: any) {
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

    return value;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.runningInfo.update({
      where: { id },
      data: {
        ...(body?.message !== undefined ? { message: String(body.message || '').trim() } : {}),
        ...(body?.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body?.linkText !== undefined ? { linkText: body.linkText ? String(body.linkText).trim() : null } : {}),
        ...(body?.linkUrl !== undefined ? { linkUrl: body.linkUrl ? String(body.linkUrl).trim() : null } : {}),
      },
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  async remove(@Param('id') id: string) {
    await this.prisma.runningInfo.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
