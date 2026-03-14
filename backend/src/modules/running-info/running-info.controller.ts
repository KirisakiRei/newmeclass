import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('running-info')
export class RunningInfoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() getActive(@Query('isActive') isActive: string) {
    if (isActive === 'true') return this.prisma.runningInfo.findMany({ where: { isActive: true } });
    return this.prisma.runningInfo.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Get('all') getAll() { return this.prisma.runningInfo.findMany({ orderBy: { createdAt: 'desc' } }); }
  @Post() create(@Body() body: any) { return this.prisma.runningInfo.create({ data: { message: body.message || '', isActive: body.isActive ?? true, linkText: body.linkText, linkUrl: body.linkUrl } }); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.prisma.runningInfo.update({ where: { id }, data: body }); }
  @Delete(':id') async remove(@Param('id') id: string) { await this.prisma.runningInfo.delete({ where: { id } }); return { message: 'Deleted' }; }
}
