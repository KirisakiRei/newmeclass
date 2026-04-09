import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ContentStatus, Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

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
  async create(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.prisma.article.create({ data: this.sanitizeArticleInput(body) });
    const mapped = this.mapArticle(created);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ARTICLE_CREATED',
      category: 'content',
      targetType: 'article',
      targetId: mapped?.id || null,
      targetLabel: mapped?.title || 'Artikel',
      summary: `Artikel ${mapped?.title || ''} dibuat.`,
      after: {
        title: mapped?.title,
        category: mapped?.category,
        status: mapped?.status,
        isPublished: mapped?.isPublished,
      },
      ipAddress: req?.ip,
    });
    return mapped;
  }
  @Put('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission(['articles.create', 'articles.edit', 'articles.delete'])
  async bulkSync(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const items = Array.isArray(body?.items) ? body.items : [];
    const replaceMissing = body?.replaceMissing !== false;
    const existing = await this.prisma.article.findMany({ orderBy: { createdAt: 'asc' } });
    const existingIds = new Set(existing.map((item) => item.id));
    const keepIds = new Set<string>();

    for (const item of items) {
      const next = this.sanitizeArticleInput(item);
      if (item?.id && existingIds.has(item.id)) {
        const updated = await this.prisma.article.update({
          where: { id: item.id },
          data: next,
        });
        keepIds.add(updated.id);
        continue;
      }

      const created = await this.prisma.article.create({
        data: next,
      });
      keepIds.add(created.id);
    }

    if (replaceMissing) {
      const deleteIds = existing
        .map((item) => item.id)
        .filter((id) => !keepIds.has(id));
      if (deleteIds.length) {
        await this.prisma.article.deleteMany({
          where: { id: { in: deleteIds } },
        });
      }
    }

    const result = await this.getAll();
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ARTICLE_BULK_UPDATED',
      category: 'content',
      targetType: 'article',
      targetId: 'bulk',
      targetLabel: 'Sinkronisasi Artikel',
      summary: 'Sinkronisasi bulk artikel dijalankan.',
      meta: {
        itemCount: items.length,
        replaceMissing,
      },
      ipAddress: req?.ip,
    });
    return result;
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('articles.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    const updated = await this.prisma.article.update({
      where: { id },
      data: this.sanitizeArticleInput({ ...this.mapArticle(existing), ...body }),
    });
    const mappedBefore = this.mapArticle(existing);
    const mapped = this.mapArticle(updated);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ARTICLE_UPDATED',
      category: 'content',
      targetType: 'article',
      targetId: id,
      targetLabel: mapped?.title || id,
      summary: `Artikel ${mapped?.title || ''} diperbarui.`,
      before: mappedBefore ? {
        title: mappedBefore.title,
        category: mappedBefore.category,
        status: mappedBefore.status,
        isPublished: mappedBefore.isPublished,
      } : null,
      after: mapped ? {
        title: mapped.title,
        category: mapped.category,
        status: mapped.status,
        isPublished: mapped.isPublished,
      } : null,
      ipAddress: req?.ip,
    });
    return mapped;
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('articles.delete')
  async remove(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.prisma.article.findUnique({ where: { id } });
    await this.prisma.article.delete({ where: { id } });
    const mappedBefore = this.mapArticle(before);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ARTICLE_DELETED',
      category: 'content',
      targetType: 'article',
      targetId: id,
      targetLabel: mappedBefore?.title || id,
      summary: `Artikel ${mappedBefore?.title || ''} dihapus.`,
      before: mappedBefore ? {
        title: mappedBefore.title,
        category: mappedBefore.category,
        status: mappedBefore.status,
        isPublished: mappedBefore.isPublished,
      } : null,
      ipAddress: req?.ip,
    });
    return { message: 'Deleted' };
  }
}
