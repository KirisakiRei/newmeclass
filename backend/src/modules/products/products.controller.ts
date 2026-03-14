import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

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
  create(@Body() body: any) {
    return this.prisma.product.create({
      data: {
        name: body.name || '',
        description: body.description,
        category: body.category,
        imageUrl: body.imageUrl,
        price: Number(body.price || 0),
        isActive: body.isActive ?? true,
      },
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.product.update({ where: { id }, data: body });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  @Post('upload-image')
  uploadImage() {
    return { url: `/uploads/products/product-${Date.now()}.png` };
  }

  @Get('categories/list')
  async categories() {
    const rows = await this.prisma.product.findMany({ select: { category: true }, distinct: ['category'] });
    return rows.map((r) => r.category).filter(Boolean);
  }

  @Get('stats/summary')
  async stats() {
    const total = await this.prisma.product.count();
    const active = await this.prisma.product.count({ where: { isActive: true } });
    return { total, active };
  }
}
