import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('banners')
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() getAll() { return this.prisma.banner.findMany({ orderBy: { order: 'asc' } }); }
  @Get(':id') getById(@Param('id') id: string) { return this.prisma.banner.findUnique({ where: { id } }); }
  @Post() create(@Body() body: any) { return this.prisma.banner.create({ data: { title: body.title, imageUrl: body.imageUrl || '', linkUrl: body.linkUrl, order: body.order || 0 } }); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.prisma.banner.update({ where: { id }, data: body }); }
  @Delete(':id') async remove(@Param('id') id: string) { await this.prisma.banner.delete({ where: { id } }); return { message: 'Deleted' }; }
  @Put('reorder')
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
