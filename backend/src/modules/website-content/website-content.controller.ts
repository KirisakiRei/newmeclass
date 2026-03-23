import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { WebsiteContentService } from './website-content.service';

@Controller('website-content')
export class WebsiteContentController {
  constructor(private readonly service: WebsiteContentService) {}

  @Get('hero-slides') getHeroSlides() { return this.service.heroSlides(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('hero_slides.create')
  @Post('hero-slides') createHeroSlide(@Body() body: any) { return this.service.createHeroSlide(body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('hero_slides.edit')
  @Put('hero-slides/:id') updateHeroSlide(@Param('id') id: string, @Body() body: any) { return this.service.updateHeroSlide(id, body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('hero_slides.delete')
  @Delete('hero-slides/:id') deleteHeroSlide(@Param('id') id: string) { return this.service.deleteHeroSlide(id); }

  @Get('products') getProducts() { return this.service.products(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('homepage_products.create')
  @Post('products') createProduct(@Body() body: any) { return this.service.createProduct(body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('homepage_products.edit')
  @Put('products/:id') updateProduct(@Param('id') id: string, @Body() body: any) { return this.service.updateProduct(id, body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('homepage_products.delete')
  @Delete('products/:id') deleteProduct(@Param('id') id: string) { return this.service.deleteProduct(id); }

  @Get('testimonials') getTestimonials() { return this.service.testimonials(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('testimonials.create')
  @Post('testimonials') createTestimonial(@Body() body: any) { return this.service.createTestimonial(body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('testimonials.edit')
  @Put('testimonials/:id') updateTestimonial(@Param('id') id: string, @Body() body: any) { return this.service.updateTestimonial(id, body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('testimonials.delete')
  @Delete('testimonials/:id') deleteTestimonial(@Param('id') id: string) { return this.service.deleteTestimonial(id); }

  @Get('activities') getActivities() { return this.service.activities(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('activities.create')
  @Post('activities') createActivity(@Body() body: any) { return this.service.createActivity(body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('activities.edit')
  @Put('activities/:id') updateActivity(@Param('id') id: string, @Body() body: any) { return this.service.updateActivity(id, body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('activities.delete')
  @Delete('activities/:id') deleteActivity(@Param('id') id: string) { return this.service.deleteActivity(id); }

  @Get('sections') getSections() { return this.service.sections(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.view')
  @Get('section-images') getSectionImages() { return this.service.sectionImages(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.edit')
  @Put('sections/reorder') reorderSections(@Body() body: any) { return this.service.reorderSections(body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.edit')
  @Put('sections/:id') updateSection(@Param('id') id: string, @Body() body: any) { return this.service.updateSection(id, body); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.manage')
  @Post('seed-defaults') seedDefaults() { return this.service.seedDefaults(); }
}
