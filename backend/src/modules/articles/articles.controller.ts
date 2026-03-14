import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() getAll() { return this.prisma.article.findMany({ orderBy: { createdAt: 'desc' } }); }
  @Get('stats/summary') async stats() { const total = await this.prisma.article.count(); return { total, published: total }; }
  @Get(':id') getById(@Param('id') id: string) { return this.prisma.article.findFirst({ where: { OR: [{ id }, { slug: id }] } }); }
  @Post() create(@Body() body: any) { return this.prisma.article.create({ data: { title: body.title || '', slug: body.slug || `article-${Date.now()}`, summary: body.summary, content: body.content || '', imageUrl: body.imageUrl } }); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.prisma.article.update({ where: { id }, data: body }); }
  @Delete(':id') async remove(@Param('id') id: string) { await this.prisma.article.delete({ where: { id } }); return { message: 'Deleted' }; }
}
