import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { WebsiteContentService } from './website-content.service';

@Controller('website-content')
export class WebsiteContentController {
  constructor(
    private readonly service: WebsiteContentService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get('hero-slides') getHeroSlides() { return this.service.heroSlides(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('hero_slides.create')
  @Post('hero-slides') async createHeroSlide(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.service.createHeroSlide(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_HERO_SLIDE_CREATED',
      category: 'content',
      targetType: 'hero_slide',
      targetId: created?.id || created?._id || null,
      targetLabel: created?.title || 'Hero Slide',
      summary: `Hero slide ${created?.title || ''} dibuat.`,
      after: {
        title: created?.title,
        subtitle: created?.subtitle,
        imageUrl: created?.imageUrl,
        order: created?.order,
      },
      ipAddress: req?.ip,
    });
    return created;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('hero_slides.edit')
  @Put('hero-slides/:id') async updateHeroSlide(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = (await this.service.heroSlides()).find((item: any) => String(item.id || item._id) === id) || null;
    const updated = await this.service.updateHeroSlide(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_HERO_SLIDE_UPDATED',
      category: 'content',
      targetType: 'hero_slide',
      targetId: id,
      targetLabel: updated?.title || id,
      summary: `Hero slide ${updated?.title || ''} diperbarui.`,
      before: before ? { title: before.title, subtitle: before.subtitle, imageUrl: before.imageUrl, order: before.order } : null,
      after: updated ? { title: updated.title, subtitle: updated.subtitle, imageUrl: updated.imageUrl, order: updated.order } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('hero_slides.delete')
  @Delete('hero-slides/:id') async deleteHeroSlide(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = (await this.service.heroSlides()).find((item: any) => String(item.id || item._id) === id) || null;
    const result = await this.service.deleteHeroSlide(id);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_HERO_SLIDE_DELETED',
      category: 'content',
      targetType: 'hero_slide',
      targetId: id,
      targetLabel: before?.title || id,
      summary: `Hero slide ${before?.title || ''} dihapus.`,
      before: before ? { title: before.title, subtitle: before.subtitle, imageUrl: before.imageUrl, order: before.order } : null,
      ipAddress: req?.ip,
    });
    return result;
  }

  @Get('products') getProducts() { return this.service.products(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('homepage_products.create')
  @Post('products') async createProduct(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.service.createProduct(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_HOMEPAGE_PRODUCT_CREATED',
      category: 'content',
      targetType: 'homepage_product',
      targetId: created?.id || created?._id || null,
      targetLabel: created?.name || 'Produk Homepage',
      summary: `Produk homepage ${created?.name || ''} dibuat.`,
      after: { name: created?.name, category: (created as any)?.category, imageUrl: created?.imageUrl, order: created?.order },
      ipAddress: req?.ip,
    });
    return created;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('homepage_products.edit')
  @Put('products/:id') async updateProduct(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = (await this.service.products()).find((item: any) => String(item.id || item._id) === id) || null;
    const updated = await this.service.updateProduct(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_HOMEPAGE_PRODUCT_UPDATED',
      category: 'content',
      targetType: 'homepage_product',
      targetId: id,
      targetLabel: updated?.name || id,
      summary: `Produk homepage ${updated?.name || ''} diperbarui.`,
      before: before ? { name: before.name, category: (before as any)?.category, imageUrl: before.imageUrl, order: before.order } : null,
      after: updated ? { name: updated.name, category: (updated as any)?.category, imageUrl: updated.imageUrl, order: updated.order } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('homepage_products.delete')
  @Delete('products/:id') async deleteProduct(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = (await this.service.products()).find((item: any) => String(item.id || item._id) === id) || null;
    const result = await this.service.deleteProduct(id);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_HOMEPAGE_PRODUCT_DELETED',
      category: 'content',
      targetType: 'homepage_product',
      targetId: id,
      targetLabel: before?.name || id,
      summary: `Produk homepage ${before?.name || ''} dihapus.`,
      before: before ? { name: before.name, category: (before as any)?.category, imageUrl: before.imageUrl, order: before.order } : null,
      ipAddress: req?.ip,
    });
    return result;
  }

  @Get('testimonials') getTestimonials() { return this.service.testimonials(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('testimonials.create')
  @Post('testimonials') async createTestimonial(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.service.createTestimonial(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_TESTIMONIAL_CREATED',
      category: 'content',
      targetType: 'testimonial',
      targetId: created?.id || created?._id || null,
      targetLabel: created?.name || 'Testimonial',
      summary: `Testimonial ${created?.name || ''} dibuat.`,
      after: { name: created?.name, description: (created as any)?.description || created?.text, imageUrl: created?.avatarUrl || created?.imageUrl },
      ipAddress: req?.ip,
    });
    return created;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('testimonials.edit')
  @Put('testimonials/:id') async updateTestimonial(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = (await this.service.testimonials()).find((item: any) => String(item.id || item._id) === id) || null;
    const updated = await this.service.updateTestimonial(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_TESTIMONIAL_UPDATED',
      category: 'content',
      targetType: 'testimonial',
      targetId: id,
      targetLabel: updated?.name || id,
      summary: `Testimonial ${updated?.name || ''} diperbarui.`,
      before: before ? { name: before.name, description: (before as any)?.description || before.text, imageUrl: before.avatarUrl || before.imageUrl } : null,
      after: updated ? { name: updated.name, description: (updated as any)?.description || updated.text, imageUrl: updated.avatarUrl || updated.imageUrl } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('testimonials.delete')
  @Delete('testimonials/:id') async deleteTestimonial(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = (await this.service.testimonials()).find((item: any) => String(item.id || item._id) === id) || null;
    const result = await this.service.deleteTestimonial(id);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_TESTIMONIAL_DELETED',
      category: 'content',
      targetType: 'testimonial',
      targetId: id,
      targetLabel: before?.name || id,
      summary: `Testimonial ${before?.name || ''} dihapus.`,
      before: before ? { name: before.name, description: (before as any)?.description || before.text, imageUrl: before.avatarUrl || before.imageUrl } : null,
      ipAddress: req?.ip,
    });
    return result;
  }

  @Get('activities') getActivities() { return this.service.activities(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('activities.create')
  @Post('activities') async createActivity(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.service.createActivity(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ACTIVITY_CREATED',
      category: 'content',
      targetType: 'activity',
      targetId: created?.id || created?._id || null,
      targetLabel: created?.title || 'Kegiatan',
      summary: `Kegiatan ${created?.title || ''} dibuat.`,
      after: { title: created?.title, description: created?.description, imageUrl: created?.imageUrl, order: created?.order },
      ipAddress: req?.ip,
    });
    return created;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('activities.edit')
  @Put('activities/:id') async updateActivity(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = (await this.service.activities()).find((item: any) => String(item.id || item._id) === id) || null;
    const updated = await this.service.updateActivity(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ACTIVITY_UPDATED',
      category: 'content',
      targetType: 'activity',
      targetId: id,
      targetLabel: updated?.title || id,
      summary: `Kegiatan ${updated?.title || ''} diperbarui.`,
      before: before ? { title: before.title, description: before.description, imageUrl: before.imageUrl, order: before.order } : null,
      after: updated ? { title: updated.title, description: updated.description, imageUrl: updated.imageUrl, order: updated.order } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('activities.delete')
  @Delete('activities/:id') async deleteActivity(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = (await this.service.activities()).find((item: any) => String(item.id || item._id) === id) || null;
    const result = await this.service.deleteActivity(id);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ACTIVITY_DELETED',
      category: 'content',
      targetType: 'activity',
      targetId: id,
      targetLabel: before?.title || id,
      summary: `Kegiatan ${before?.title || ''} dihapus.`,
      before: before ? { title: before.title, description: before.description, imageUrl: before.imageUrl, order: before.order } : null,
      ipAddress: req?.ip,
    });
    return result;
  }

  @Get('sections') getSections() { return this.service.sections(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.view')
  @Get('section-images') getSectionImages() { return this.service.sectionImages(); }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.edit')
  @Put('sections/reorder') async reorderSections(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const result = await this.service.reorderSections(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_WEBSITE_SECTION_REORDERED',
      category: 'content',
      targetType: 'website_section',
      targetId: 'reorder',
      targetLabel: 'Urutan Section Website',
      summary: 'Urutan section website diperbarui.',
      meta: {
        itemCount: Array.isArray(body?.orders || body) ? (body.orders || body).length : 0,
      },
      ipAddress: req?.ip,
    });
    return result;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.edit')
  @Put('sections/:id') async updateSection(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = (await this.service.sections()).find((item: any) => String(item.id || item._id) === id) || null;
    const updated = await this.service.updateSection(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_WEBSITE_SECTION_UPDATED',
      category: 'content',
      targetType: 'website_section',
      targetId: id,
      targetLabel: updated?.title || updated?.key || id,
      summary: `Section website ${updated?.title || updated?.key || id} diperbarui.`,
      before: before ? { title: before.title, type: (before as any)?.type, description: (before as any)?.description, order: before.order } : null,
      after: updated ? { title: updated.title, type: (updated as any)?.type, description: (updated as any)?.description, order: updated.order } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('website_content.manage')
  @Post('seed-defaults') async seedDefaults(@CurrentUser() user: any, @Req() req: any) {
    const result = await this.service.seedDefaults();
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_WEBSITE_CONTENT_SEEDED',
      category: 'content',
      targetType: 'website_content',
      targetId: 'seed-defaults',
      targetLabel: 'Website Content Defaults',
      summary: 'Seed default website content dijalankan.',
      meta: result as any,
      ipAddress: req?.ip,
    });
    return result;
  }
}
