import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ContentStatus, Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(input: string) {
    return String(input || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || `article-${Date.now()}`;
  }

  private toContentStatus(isPublished?: boolean, status?: string) {
    if (typeof isPublished === 'boolean') {
      return isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
    }
    if (typeof status === 'string' && status in ContentStatus) {
      return status as ContentStatus;
    }
    return undefined;
  }

  private normalizeTags(tags: any) {
    if (Array.isArray(tags)) return tags.map((item) => String(item).trim()).filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map((item) => item.trim()).filter(Boolean);
    return [];
  }

  private mapArticle(row: any) {
    if (!row) return null;
    const tags = Array.isArray(row.tags) ? row.tags : [];
    return {
      id: row.id,
      _id: row.id,
      title: row.title || '',
      slug: row.slug || '',
      excerpt: row.excerpt || row.summary || '',
      summary: row.summary || row.excerpt || '',
      content: row.content || '',
      category: row.category || 'edukasi',
      tags,
      imageUrl: row.featuredImage || row.imageUrl || '',
      featuredImage: row.featuredImage || row.imageUrl || '',
      isPublished: row.isPublished ?? row.status === ContentStatus.PUBLISHED,
      status: row.status,
      viewCount: Number(row.viewCount || 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private sanitizeArticleInput(body: any) {
    const nextStatus = this.toContentStatus(body?.isPublished, body?.status);
    const title = body?.title || '';
    const excerpt = body?.excerpt || body?.summary || '';
    return {
      title,
      slug: body?.slug || this.slugify(title),
      summary: excerpt,
      excerpt,
      category: body?.category || 'edukasi',
      tags: this.normalizeTags(body?.tags),
      content: body?.content || '',
      imageUrl: body?.imageUrl || body?.featuredImage || '',
      featuredImage: body?.featuredImage || body?.imageUrl || '',
      isPublished: body?.isPublished ?? true,
      ...(nextStatus ? { status: nextStatus } : {}),
    };
  }

  @Get()
  async getAll(@Query('isPublished') isPublished?: string, @Query('limit') limit?: string) {
    const rows = await this.prisma.article.findMany({
      where: {
        ...(typeof isPublished === 'string' ? { isPublished: isPublished === 'true' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: Number(limit) || undefined } : {}),
    });
    return rows.map((row) => this.mapArticle(row));
  }
  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('articles.view')
  async stats() {
    const [total, published, draft] = await Promise.all([
      this.prisma.article.count(),
      this.prisma.article.count({ where: { isPublished: true } }),
      this.prisma.article.count({ where: { isPublished: false } }),
    ]);
    return { total, published, draft, totalViews: 0 };
  }
  @Get(':id')
  async getById(@Param('id') id: string) {
    const row = await this.prisma.article.findFirst({ where: { OR: [{ id }, { slug: id }] } });
    return this.mapArticle(row);
  }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('articles.create')
  async create(@Body() body: any) {
    const created = await this.prisma.article.create({ data: this.sanitizeArticleInput(body) });
    return this.mapArticle(created);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('articles.edit')
  async update(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    const updated = await this.prisma.article.update({
      where: { id },
      data: this.sanitizeArticleInput({ ...this.mapArticle(existing), ...body }),
    });
    return this.mapArticle(updated);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('articles.delete')
  async remove(@Param('id') id: string) { await this.prisma.article.delete({ where: { id } }); return { message: 'Deleted' }; }
}
