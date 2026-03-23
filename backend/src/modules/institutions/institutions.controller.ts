import { Body, Controller, Get, Post, Put, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('inquiry')
  create(@Body() body: any) {
    return this.prisma.institutionInquiry.create({ data: { name: body.name || '', contact: body.contact || '', message: body.message || '' } });
  }

  @Get()
  getAll() {
    return this.prisma.institutionInquiry.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.prisma.institutionInquiry.findUnique({ where: { id } });
  }

  @Get('stats/summary')
  async stats() {
    const total = await this.prisma.institutionInquiry.count();
    return { total };
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Query('status') status: string) {
    return this.prisma.institutionInquiry.update({ where: { id }, data: { status } });
  }
}
