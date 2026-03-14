import { Body, Controller, Get, Post, Put, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post() create(@Body() body: any) {
    return this.prisma.contactMessage.create({ data: { name: body.name || '', email: body.email || '', message: body.message || '' } });
  }

  @Get() getAll() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Get('stats/summary') async stats() {
    const total = await this.prisma.contactMessage.count();
    return { total };
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Query('status') status: string, @Query('notes') notes?: string) {
    return this.prisma.contactMessage.update({ where: { id }, data: { status, notes } });
  }
}
