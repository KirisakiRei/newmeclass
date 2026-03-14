import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.getAll();
  }

  @Put()
  update(@Body() body: any) {
    return this.settingsService.updateAll(body);
  }

  @Post('upload/:assetType')
  uploadAsset(@Param('assetType') assetType: string) {
    return { url: `/uploads/settings/${assetType}-${Date.now()}.png` };
  }

  @Delete('banner/:index')
  deleteBanner(@Param('index') index: string) {
    return this.settingsService.deleteBanner(Number(index));
  }

  @Get('jenjang-config')
  getJenjangConfig() {
    return this.settingsService.getJenjangConfig();
  }

  @Put('jenjang-config')
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
}
