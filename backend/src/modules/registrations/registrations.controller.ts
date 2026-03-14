import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@Body() body: any) {
    return this.prisma.registrationLead.create({ data: { fullName: body.fullName || body.name || '', email: body.email || '', phone: body.phone, source: body.source } });
  }

  @Get()
  getAll() {
    return this.prisma.registrationLead.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Get('stats/summary')
  async stats() {
    const total = await this.prisma.registrationLead.count();
    return { total };
  }
}
