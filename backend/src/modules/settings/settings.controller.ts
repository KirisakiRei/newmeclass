import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { UploadService } from '../upload/upload.service';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly uploadService: UploadService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get()
  get() {
    return this.settingsService.getAll();
  }

  @Get('team-management')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('team_management.view')
  getTeamManagement() {
    return this.settingsService.getTeamManagement();
  }

  @Put('team-management/:sectionKey')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission(['team_management.create', 'team_management.edit', 'team_management.delete'])
  async updateTeamManagementSection(@CurrentUser() user: any, @Req() req: any, @Param('sectionKey') sectionKey: string, @Body() body: any) {
    const allowedSections = new Set(['boardOfDirectors', 'teamSupport', 'partners']);
    if (!allowedSections.has(sectionKey)) {
      throw new BadRequestException('Section team management tidak valid');
    }

    const before = await this.settingsService.getTeamManagement();
    const updated = await this.settingsService.updateTeamManagementSection(sectionKey, body?.items);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_TEAM_MANAGEMENT_UPDATED',
      category: 'settings',
      targetType: 'team_management',
      targetId: sectionKey,
      targetLabel: sectionKey,
      summary: `Section team management ${sectionKey} diperbarui.`,
      before: {
        itemCount: Array.isArray(before?.[sectionKey]) ? before[sectionKey].length : 0,
      },
      after: {
        itemCount: Array.isArray(updated?.[sectionKey]) ? updated[sectionKey].length : 0,
      },
      meta: {
        sectionKey,
      },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const before = await this.settingsService.getAll();
    const updated = await this.settingsService.updateAll(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_SETTINGS_UPDATED',
      category: 'settings',
      targetType: 'settings',
      targetId: 'general',
      targetLabel: 'Pengaturan Umum',
      summary: 'Pengaturan umum diperbarui.',
      before: before ? {
        siteName: before.siteName,
        companyName: before.companyName,
        phone: before.phone,
        email: before.email,
        whatsapp: before.whatsapp,
        maintenanceMode: before.maintenanceMode,
        paymentAmount: before.paymentAmount,
        devFeePercent: before.devFeePercent,
      } : null,
      after: updated ? {
        siteName: updated.siteName,
        companyName: updated.companyName,
        phone: updated.phone,
        email: updated.email,
        whatsapp: updated.whatsapp,
        maintenanceMode: updated.maintenanceMode,
        paymentAmount: updated.paymentAmount,
        devFeePercent: updated.devFeePercent,
      } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Post('upload/:assetType')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.manage')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!String(file.mimetype || '').startsWith('image/')) {
        callback(new BadRequestException('Hanya file gambar yang diperbolehkan'), false);
        return;
      }
      callback(null, true);
    },
  }))
  async uploadAsset(@CurrentUser() user: any, @Req() req: any, @Param('assetType') assetType: string, @UploadedFile() file: any) {
    const uploaded = await this.uploadService.saveImage(file, {
      folder: 'settings',
      prefix: assetType || 'asset',
      category: 'general',
      registerInMedia: false,
    });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_SETTINGS_ASSET_UPLOADED',
      category: 'settings',
      targetType: 'settings',
      targetId: assetType,
      targetLabel: assetType,
      summary: `Aset pengaturan ${assetType} diunggah.`,
      after: {
        type: assetType,
        imageUrl: uploaded?.url || null,
      },
      ipAddress: req?.ip,
    });
    return uploaded;
  }

  @Delete('banner/:index')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.manage')
  async deleteBanner(@CurrentUser() user: any, @Req() req: any, @Param('index') index: string) {
    const before = await this.settingsService.getGeneral();
    const result = await this.settingsService.deleteBanner(Number(index));
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_SETTINGS_UPDATED',
      category: 'settings',
      targetType: 'settings',
      targetId: `banner:${index}`,
      targetLabel: `Banner ${index}`,
      summary: `Banner pengaturan indeks ${index} dihapus.`,
      before: {
        itemCount: Array.isArray(before?.banners) ? before.banners.length : 0,
      },
      after: {
        itemCount: Array.isArray(result?.banners) ? result.banners.length : 0,
      },
      ipAddress: req?.ip,
    });
    return result;
  }

  @Get('jenjang-config')
  getJenjangConfig() {
    return this.settingsService.getJenjangConfig();
  }

  @Put('jenjang-config')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.manage')
  async updateJenjangConfig(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const before = await this.settingsService.getJenjangConfig();
    const updated = await this.settingsService.updateJenjangConfig(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_JENJANG_CONFIG_UPDATED',
      category: 'settings',
      targetType: 'settings',
      targetId: 'jenjangConfig',
      targetLabel: 'Konfigurasi Jenjang',
      summary: 'Konfigurasi jenjang diperbarui.',
      before: before as any,
      after: updated as any,
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Get('test-price')
  getTestPrice() {
    return this.settingsService.getTestPrice();
  }

  @Get('general')
  getGeneral() {
    return this.settingsService.getGeneral();
  }

  @Get('system-summary')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.manage')
  getSystemSummary() {
    return this.settingsService.getSystemSummary();
  }
}
