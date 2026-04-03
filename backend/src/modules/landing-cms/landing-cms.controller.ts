import { BadRequestException, Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthAudience, Role } from '@prisma/client';
import { AuthAudienceAccess } from 'src/common/auth/auth-audience.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { LandingCmsService } from './landing-cms.service';
import { LANDING_CMS_DOMAIN_KEYS, type LandingDomainKey } from './landing-cms.defaults';

const isLandingDomainKey = (value: string): value is LandingDomainKey => (
  LANDING_CMS_DOMAIN_KEYS.includes(value as LandingDomainKey)
);

@Controller('landing')
export class LandingCmsController {
  constructor(private readonly landingCmsService: LandingCmsService) {}

  @Get('public/bootstrap')
  getPublicBootstrap() {
    return this.landingCmsService.getPublicBootstrap();
  }

  @Get('public/home')
  getPublicHome() {
    return this.landingCmsService.getPublicHome();
  }

  @Get('public/company-profile')
  getPublicCompanyProfile() {
    return this.landingCmsService.getPublicCompanyProfile();
  }

  @Get('public/services')
  getPublicServices() {
    return this.landingCmsService.getPublicServices();
  }

  @Get('public/services/:slug')
  getPublicServiceBySlug(@Param('slug') slug: string) {
    return this.landingCmsService.getPublicServiceBySlug(slug);
  }

  @Get('public/shop')
  getPublicShop() {
    return this.landingCmsService.getPublicShop();
  }

  @Get('public/privacy-policy')
  getPublicPrivacyPolicy() {
    return this.landingCmsService.getPublicPrivacyPolicy();
  }

  @Get('public/contact')
  getPublicContact() {
    return this.landingCmsService.getPublicContact();
  }

  @Get('public/navigation')
  getPublicNavigation() {
    return this.landingCmsService.getPublicNavigation();
  }

  @Get('public/state')
  getPublicState() {
    return this.landingCmsService.getPublicState();
  }

  @Get('public/locations/provinces')
  getProvinces() {
    return this.landingCmsService.getLocationCollection('provinces');
  }

  @Get('public/locations/cities')
  getCities(@Query('provinceId') provinceId?: string) {
    return this.landingCmsService.getLocationCollection('cities', provinceId);
  }

  @Get('public/locations/districts')
  getDistricts(@Query('cityId') cityId?: string) {
    return this.landingCmsService.getLocationCollection('districts', cityId);
  }

  @Get('public/locations/villages')
  getVillages(@Query('districtId') districtId?: string) {
    return this.landingCmsService.getLocationCollection('villages', districtId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('cms_access.manage')
  @Get('cms/summary')
  getCmsSummary() {
    return this.landingCmsService.getCmsSummary();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('cms_access.manage')
  @Get('cms/state')
  getCmsState() {
    return this.landingCmsService.getCmsState();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('cms_access.manage')
  @Get('cms/:domainKey')
  getCmsDomain(@Param('domainKey') domainKey: string) {
    if (!isLandingDomainKey(domainKey)) {
      throw new BadRequestException('Domain landing CMS tidak valid');
    }
    return this.landingCmsService.getCmsDomain(domainKey);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('cms_access.manage')
  @Put('cms/:domainKey')
  updateCmsDomain(@Param('domainKey') domainKey: string, @Body() body: any) {
    if (!isLandingDomainKey(domainKey)) {
      throw new BadRequestException('Domain landing CMS tidak valid');
    }
    const value = body && Object.prototype.hasOwnProperty.call(body, 'value') ? body.value : body;
    return this.landingCmsService.updateDomain(domainKey, value);
  }
}
