import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { UploadService } from '../upload/upload.service';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly uploadService: UploadService,
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
  updateTeamManagementSection(@Param('sectionKey') sectionKey: string, @Body() body: any) {
    const allowedSections = new Set(['boardOfDirectors', 'teamSupport', 'partners']);
    if (!allowedSections.has(sectionKey)) {
      throw new BadRequestException('Section team management tidak valid');
    }

    return this.settingsService.updateTeamManagementSection(sectionKey, body?.items);
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.edit')
  update(@Body() body: any) {
    return this.settingsService.updateAll(body);
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
  uploadAsset(@Param('assetType') assetType: string, @UploadedFile() file: any) {
    return this.uploadService.saveImage(file, {
      folder: 'settings',
      prefix: assetType || 'asset',
      category: 'general',
      registerInMedia: false,
    });
  }

  @Delete('banner/:index')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.manage')
  deleteBanner(@Param('index') index: string) {
    return this.settingsService.deleteBanner(Number(index));
  }

  @Get('jenjang-config')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.manage')
  getJenjangConfig() {
    return this.settingsService.getJenjangConfig();
  }

  @Put('jenjang-config')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('settings.manage')
  updateJenjangConfig(@Body() body: any) {
    return this.settingsService.updateJenjangConfig(body);
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
