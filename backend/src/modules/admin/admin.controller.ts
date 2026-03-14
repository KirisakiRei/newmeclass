import { Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
@Controller('admin')
export class AdminCompatController {
  constructor(private readonly prisma: PrismaService) {}

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  @Get('yayasan')
  yayasanListLegacy() { return this.prisma.user.findMany({ where: { role: Role.YAYASAN } }); }

  @Put('yayasan/:id/approve')
  approveYayasanLegacy(@Param('id') id: string) {
    return this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  @Put('yayasan/:id/toggle')
  async toggleYayasanLegacy(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return this.prisma.user.update({ where: { id }, data: { status: row?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  }

  @Delete('yayasan/:id')
  async deleteYayasanLegacy(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Yayasan deleted' };
  }

  @Get('mitra')
  mitraListLegacy() { return this.prisma.user.findMany({ where: { role: Role.MITRA } }); }

  @Get('mitra/stats')
  async mitraStats() {
    const total = await this.prisma.user.count({ where: { role: Role.MITRA } });
    return { total, verified: total, active: total, totalYayasan: 0 };
  }

  @Put('mitra/:id/verify')
  verifyMitraLegacy(@Param('id') id: string) { return this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } }); }

  @Put('mitra/:id/toggle-active')
  async toggleMitraLegacy(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return this.prisma.user.update({ where: { id }, data: { status: row?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  }

  @Post('mitra/:id/reset-password')
  async resetMitraLegacy(@Param('id') id: string) {
    const temporaryPassword = `Reset-${randomBytes(4).toString('hex')}`;
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: this.hash(temporaryPassword) },
    });
    return { message: `Password reset for ${id}` };
  }

  @Get('mitra/withdrawals')
  mitraWithdrawalsLegacy() { return this.prisma.disbursement.findMany({ where: { type: 'mitra' } }); }

  @Put('mitra/withdrawals/:id/approve')
  approveMitraWithdrawalLegacy(@Param('id') id: string) { return this.prisma.disbursement.update({ where: { id }, data: { status: 'APPROVED', processedAt: new Date() } }); }

  @Put('mitra/withdrawals/:id/reject')
  rejectMitraWithdrawalLegacy(@Param('id') id: string) { return this.prisma.disbursement.update({ where: { id }, data: { status: 'REJECTED', processedAt: new Date() } }); }

  @Get('withdrawals')
  yayasanWithdrawalsLegacy() { return this.prisma.disbursement.findMany({ where: { type: 'yayasan' } }); }

  @Put('withdrawals/:id/approve')
  approveYayasanWithdrawalLegacy(@Param('id') id: string) { return this.prisma.disbursement.update({ where: { id }, data: { status: 'APPROVED', processedAt: new Date() } }); }

  @Put('withdrawals/:id/reject')
  rejectYayasanWithdrawalLegacy(@Param('id') id: string) { return this.prisma.disbursement.update({ where: { id }, data: { status: 'REJECTED', processedAt: new Date() } }); }
}
