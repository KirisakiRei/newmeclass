import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('media')
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  private mapAsset(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      _id: row.id,
      category: row.category || 'general',
      name: row.name || 'asset',
      url: row.url || '',
      createdAt: row.createdAt,
    };
  }

  @Get()
  async getAll(@Query('category') category?: string) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapAsset(row));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('media.create')
  async create(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.prisma.mediaAsset.create({
      data: {
        category: body.category || 'general',
        name: body.name || 'asset',
        url: body.url || '',
      },
    });
    const mapped = this.mapAsset(created);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_MEDIA_CREATED',
      category: 'content',
      targetType: 'media_asset',
      targetId: mapped?.id || null,
      targetLabel: mapped?.name || 'Media',
      summary: `Media ${mapped?.name || ''} ditambahkan.`,
      after: mapped as any,
      ipAddress: req?.ip,
    });
    return mapped;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('media.manage')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = await this.prisma.mediaAsset.findUnique({ where: { id } });
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        category: body.category || undefined,
        name: body.name || undefined,
        url: body.url || undefined,
      },
    });
    const mappedBefore = this.mapAsset(before);
    const mapped = this.mapAsset(updated);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_MEDIA_UPDATED',
      category: 'content',
      targetType: 'media_asset',
      targetId: id,
      targetLabel: mapped?.name || id,
      summary: `Media ${mapped?.name || ''} diperbarui.`,
      before: mappedBefore as any,
      after: mapped as any,
      ipAddress: req?.ip,
    });
    return mapped;
  }

  @Post('sync-content-assets')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('media.manage')
  async syncContentAssets(@CurrentUser() user: any, @Req() req: any) {
    const existing = await this.prisma.mediaAsset.findMany({
      select: { url: true },
    });
    const existingUrls = new Set(existing.map((item) => item.url).filter(Boolean));
    const candidates: Array<{ category: string; name: string; url: string }> = [];

    const [
      heroSlides,
      homepageProducts,
      testimonials,
      activities,
      articles,
      banners,
      products,
    ] = await Promise.all([
      this.prisma.heroSlide.findMany({ select: { title: true, imageUrl: true } }),
      this.prisma.homepageProduct.findMany({ select: { name: true, imageUrl: true } }),
      this.prisma.testimonial.findMany({ select: { name: true, avatarUrl: true } }),
      this.prisma.activity.findMany({ select: { title: true, imageUrl: true } }),
      this.prisma.article.findMany({ select: { title: true, imageUrl: true, featuredImage: true } }),
      this.prisma.banner.findMany({ select: { title: true, imageUrl: true } }),
      this.prisma.product.findMany({ select: { name: true, imageUrl: true } }),
    ]);

    heroSlides.forEach((item) => item.imageUrl && candidates.push({ category: 'hero-slides', name: item.title || 'Hero Slide', url: item.imageUrl }));
    homepageProducts.forEach((item) => item.imageUrl && candidates.push({ category: 'products-home', name: item.name || 'Produk Homepage', url: item.imageUrl }));
    testimonials.forEach((item) => item.avatarUrl && candidates.push({ category: 'testimonials', name: item.name || 'Testimonial', url: item.avatarUrl }));
    activities.forEach((item) => item.imageUrl && candidates.push({ category: 'activities', name: item.title || 'Kegiatan', url: item.imageUrl }));
    articles.forEach((item) => {
      if (item.featuredImage) candidates.push({ category: 'articles', name: item.title || 'Artikel', url: item.featuredImage });
      if (item.imageUrl && item.imageUrl !== item.featuredImage) candidates.push({ category: 'articles', name: item.title || 'Artikel', url: item.imageUrl });
    });
    banners.forEach((item) => item.imageUrl && candidates.push({ category: 'banners', name: item.title || 'Banner', url: item.imageUrl }));
    products.forEach((item) => item.imageUrl && candidates.push({ category: 'products-shop', name: item.name || 'Produk Shop', url: item.imageUrl }));

    const inserts = candidates.filter((item) => item.url && !existingUrls.has(item.url));
    if (inserts.length) {
      await this.prisma.mediaAsset.createMany({
        data: inserts,
      });
    }

    const result = {
      message: 'Sinkronisasi media dari konten selesai',
      inserted: inserts.length,
      scanned: candidates.length,
    };
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_MEDIA_SYNCED',
      category: 'content',
      targetType: 'media_asset',
      targetId: 'sync-content-assets',
      targetLabel: 'Sinkronisasi Media',
      summary: 'Sinkronisasi media dari konten dijalankan.',
      meta: result as any,
      ipAddress: req?.ip,
    });
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('media.delete')
  async remove(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.prisma.mediaAsset.findUnique({ where: { id } });
    await this.prisma.mediaAsset.delete({ where: { id } });
    const mappedBefore = this.mapAsset(before);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_MEDIA_DELETED',
      category: 'content',
      targetType: 'media_asset',
      targetId: id,
      targetLabel: mappedBefore?.name || id,
      summary: `Media ${mappedBefore?.name || ''} dihapus.`,
      before: mappedBefore as any,
      ipAddress: req?.ip,
    });
    return { message: 'Deleted' };
  }
}
