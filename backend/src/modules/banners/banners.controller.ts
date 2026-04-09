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

@Controller('banners')
export class BannersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  private toContentStatus(isActive?: boolean, status?: string) {
    if (typeof isActive === 'boolean') {
      return isActive ? ContentStatus.PUBLISHED : ContentStatus.ARCHIVED;
    }
    if (typeof status === 'string' && status in ContentStatus) {
      return status as ContentStatus;
    }
    return undefined;
  }

  private mapBanner(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      _id: row.id,
      title: row.title || '',
      description: row.description || '',
      imageUrl: row.imageUrl || '',
      type: row.type || 'slider',
      link: row.linkUrl || '',
      linkUrl: row.linkUrl || '',
      order: Number(row.order || 0),
      isActive: row.isActive ?? row.status === ContentStatus.PUBLISHED,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private sanitizeBannerInput(body: any) {
    const nextStatus = this.toContentStatus(body?.isActive, body?.status);
    return {
      title: body?.title || '',
      description: body?.description || '',
      imageUrl: body?.imageUrl || '',
      type: body?.type || 'slider',
      linkUrl: body?.linkUrl || body?.link || '',
      order: Number(body?.order || 0),
      isActive: body?.isActive ?? true,
      ...(nextStatus ? { status: nextStatus } : {}),
    };
  }

  @Get()
  async getAll(@Query('type') type?: string, @Query('isActive') isActive?: string) {
    const rows = await this.prisma.banner.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(typeof isActive === 'string' ? { isActive: isActive === 'true' } : {}),
      },
      orderBy: { order: 'asc' },
    });
    return rows.map((row) => this.mapBanner(row));
  }
  @Get(':id')
  async getById(@Param('id') id: string) {
    const row = await this.prisma.banner.findUnique({ where: { id } });
    return this.mapBanner(row);
  }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('banners.create')
  async create(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.prisma.banner.create({ data: this.sanitizeBannerInput(body) });
    const mapped = this.mapBanner(created);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_BANNER_CREATED',
      category: 'content',
      targetType: 'banner',
      targetId: mapped?.id || null,
      targetLabel: mapped?.title || 'Banner',
      summary: `Banner ${mapped?.title || ''} dibuat.`,
      after: mapped as any,
      ipAddress: req?.ip,
    });
    return mapped;
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('banners.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    const updated = await this.prisma.banner.update({
      where: { id },
      data: this.sanitizeBannerInput({ ...this.mapBanner(existing), ...body }),
    });
    const mappedBefore = this.mapBanner(existing);
    const mapped = this.mapBanner(updated);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_BANNER_UPDATED',
      category: 'content',
      targetType: 'banner',
      targetId: id,
      targetLabel: mapped?.title || id,
      summary: `Banner ${mapped?.title || ''} diperbarui.`,
      before: mappedBefore as any,
      after: mapped as any,
      ipAddress: req?.ip,
    });
    return mapped;
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('banners.delete')
  async remove(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.prisma.banner.findUnique({ where: { id } });
    await this.prisma.banner.delete({ where: { id } });
    const mappedBefore = this.mapBanner(before);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_BANNER_DELETED',
      category: 'content',
      targetType: 'banner',
      targetId: id,
      targetLabel: mappedBefore?.title || id,
      summary: `Banner ${mappedBefore?.title || ''} dihapus.`,
      before: mappedBefore as any,
      ipAddress: req?.ip,
    });
    return { message: 'Deleted' };
  }
  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('banners.manage')
  async reorder(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const orders = Array.isArray(body?.orders) ? body.orders : Array.isArray(body) ? body : [];
    for (const item of orders) {
      const id = item.id || item._id;
      if (!id) continue;
      await this.prisma.banner.update({ where: { id }, data: { order: Number(item.order || 0) } });
    }
    const result = { message: 'Order updated' };
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_BANNER_REORDERED',
      category: 'content',
      targetType: 'banner',
      targetId: 'reorder',
      targetLabel: 'Urutan Banner',
      summary: 'Urutan banner diperbarui.',
      meta: {
        itemCount: orders.length,
      },
      ipAddress: req?.ip,
    });
    return result;
  }
}
