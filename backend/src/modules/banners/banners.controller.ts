import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ContentStatus, Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('banners')
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

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
  async create(@Body() body: any) {
    const created = await this.prisma.banner.create({ data: this.sanitizeBannerInput(body) });
    return this.mapBanner(created);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('banners.edit')
  async update(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    const updated = await this.prisma.banner.update({
      where: { id },
      data: this.sanitizeBannerInput({ ...this.mapBanner(existing), ...body }),
    });
    return this.mapBanner(updated);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('banners.delete')
  async remove(@Param('id') id: string) { await this.prisma.banner.delete({ where: { id } }); return { message: 'Deleted' }; }
  @Put('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('banners.manage')
  async reorder(@Body() body: any) {
    const orders = Array.isArray(body?.orders) ? body.orders : Array.isArray(body) ? body : [];
    for (const item of orders) {
      const id = item.id || item._id;
      if (!id) continue;
      await this.prisma.banner.update({ where: { id }, data: { order: Number(item.order || 0) } });
    }
    return { message: 'Order updated' };
  }
}
