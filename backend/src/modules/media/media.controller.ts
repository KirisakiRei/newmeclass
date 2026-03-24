import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('media')
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

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
  async create(@Body() body: any) {
    const created = await this.prisma.mediaAsset.create({
      data: {
        category: body.category || 'general',
        name: body.name || 'asset',
        url: body.url || '',
      },
    });
    return this.mapAsset(created);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('media.manage')
  async update(@Param('id') id: string, @Body() body: any) {
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        category: body.category || undefined,
        name: body.name || undefined,
        url: body.url || undefined,
      },
    });
    return this.mapAsset(updated);
  }

  @Post('sync-content-assets')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('media.manage')
  async syncContentAssets() {
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

    return {
      message: 'Sinkronisasi media dari konten selesai',
      inserted: inserts.length,
      scanned: candidates.length,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('media.delete')
  async remove(@Param('id') id: string) { await this.prisma.mediaAsset.delete({ where: { id } }); return { message: 'Deleted' }; }
}
