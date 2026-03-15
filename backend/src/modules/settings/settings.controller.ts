import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.getAll();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  update(@Body() body: any) {
    return this.settingsService.updateAll(body);
  }

  @Post('upload/:assetType')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  uploadAsset(@Param('assetType') assetType: string) {
    return { url: `/uploads/settings/${assetType}-${Date.now()}.png` };
  }

  @Delete('banner/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  deleteBanner(@Param('index') index: string) {
    return this.settingsService.deleteBanner(Number(index));
  }

  @Get('jenjang-config')
  getJenjangConfig() {
    return this.settingsService.getJenjangConfig();
  }

  @Put('jenjang-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getSystemSummary() {
    return this.settingsService.getSystemSummary();
  }
}
