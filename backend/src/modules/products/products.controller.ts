import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get()
  getAll(@Query('category') category?: string) {
    return this.prisma.product.findMany({
      where: category ? { category } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('shop_products.create')
  async create(@CurrentUser() user: any, @Req() req: any, @Body() body: any) {
    const created = await this.prisma.product.create({
      data: {
        name: body.name || '',
        description: body.description,
        category: body.category,
        imageUrl: body.imageUrl,
        price: Number(body.price || 0),
        isActive: body.isActive ?? true,
      },
    });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_SHOP_PRODUCT_CREATED',
      category: 'content',
      targetType: 'shop_product',
      targetId: created.id,
      targetLabel: created.name,
      summary: `Produk shop ${created.name} dibuat.`,
      after: {
        name: created.name,
        category: created.category,
        price: created.price,
        isActive: created.isActive,
      },
      ipAddress: req?.ip,
    });
    return created;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('shop_products.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const before = await this.prisma.product.findUnique({ where: { id } });
    const updated = await this.prisma.product.update({ where: { id }, data: body });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_SHOP_PRODUCT_UPDATED',
      category: 'content',
      targetType: 'shop_product',
      targetId: id,
      targetLabel: updated.name,
      summary: `Produk shop ${updated.name} diperbarui.`,
      before: before ? {
        name: before.name,
        category: before.category,
        price: before.price,
        isActive: before.isActive,
      } : null,
      after: {
        name: updated.name,
        category: updated.category,
        price: updated.price,
        isActive: updated.isActive,
      },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('shop_products.delete')
  async remove(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.prisma.product.findUnique({ where: { id } });
    await this.prisma.product.delete({ where: { id } });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_SHOP_PRODUCT_DELETED',
      category: 'content',
      targetType: 'shop_product',
      targetId: id,
      targetLabel: before?.name || id,
      summary: `Produk shop ${before?.name || ''} dihapus.`,
      before: before ? {
        name: before.name,
        category: before.category,
        price: before.price,
        isActive: before.isActive,
      } : null,
      ipAddress: req?.ip,
    });
    return { message: 'Deleted' };
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('shop_products.manage')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!String(file.mimetype || '').startsWith('image/')) {
        callback(new BadRequestException('Hanya file gambar yang diperbolehkan'), false);
        return;
      }
      callback(null, true);
    },
  }))
  uploadImage(@UploadedFile() file: any, @Body() body: any) {
    return this.uploadService.saveImage(file, {
      folder: 'products',
      prefix: 'product',
      category: body?.category || 'products-shop',
      registerInMedia: true,
      name: body?.name || file?.originalname,
    });
  }

  @Get('categories/list')
  async categories() {
    const rows = await this.prisma.product.findMany({ select: { category: true }, distinct: ['category'] });
    return rows.map((r) => r.category).filter(Boolean);
  }

  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('shop_products.view')
  async stats() {
    const total = await this.prisma.product.count();
    const active = await this.prisma.product.count({ where: { isActive: true } });
    return { total, active };
  }
}
