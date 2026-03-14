import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('media')
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() getAll() { return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } }); }
  @Post() create(@Body() body: any) { return this.prisma.mediaAsset.create({ data: { category: body.category || 'general', name: body.name || 'asset', url: body.url || '' } }); }
  @Delete(':id') async remove(@Param('id') id: string) { await this.prisma.mediaAsset.delete({ where: { id } }); return { message: 'Deleted' }; }
}
