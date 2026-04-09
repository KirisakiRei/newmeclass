import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { UsersService } from './users.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatusQueryDto } from './dto/user-status-query.dto';
import { BanUserQueryDto } from './dto/ban-user-query.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get()
  @AdminPermission('users.view')
  getAll(@Query() query: UsersQueryDto) {
    return this.usersService.getAll(query);
  }

  @Get('stats/summary')
  @AdminPermission('users.view')
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @AdminPermission('users.view')
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Put(':id')
  @AdminPermission('users.edit')
  async update(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: UpdateUserDto) {
    const before = await this.usersService.getById(id);
    const updated = await this.usersService.update(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_UPDATED_PROFILE',
      category: 'users',
      targetType: 'user',
      targetId: id,
      targetLabel: updated?.fullName || updated?.email || 'User',
      summary: `Profil user ${updated?.email || updated?.fullName || ''} diperbarui.`,
      before: before ? {
        fullName: before.fullName,
        email: before.email,
        phone: before.phone,
        status: before.status,
        paymentStatus: before.paymentStatus,
        freeTestStatus: before.freeTestStatus,
        paidTestStatus: before.paidTestStatus,
        province: before.province,
        city: before.city,
        district: before.district,
        village: before.village,
        address: before.address,
        userType: before.userType,
      } : null,
      after: updated ? {
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        freeTestStatus: updated.freeTestStatus,
        paidTestStatus: updated.paidTestStatus,
        province: updated.province,
        city: updated.city,
        district: updated.district,
        village: updated.village,
        address: updated.address,
        userType: updated.userType,
      } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Put(':id/status')
  @AdminPermission('users.manage')
  async updateStatus(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Query() query: UserStatusQueryDto) {
    const { status } = query;
    const before = await this.usersService.getById(id);
    const updated = await this.usersService.updateStatus(id, status);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_STATUS_UPDATED',
      category: 'users',
      targetType: 'user',
      targetId: id,
      targetLabel: updated?.fullName || updated?.email || 'User',
      summary: `Status user ${updated?.email || updated?.fullName || ''} diubah menjadi ${updated?.status || status}.`,
      before: { status: before?.status || null },
      after: { status: updated?.status || status || null },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Put(':id/ban')
  @AdminPermission('users.manage')
  async ban(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Query() query: BanUserQueryDto) {
    const reason = query.reason || 'Pelanggaran aturan';
    const before = await this.usersService.getById(id);
    const updated = await this.usersService.ban(id, reason);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_BANNED',
      category: 'users',
      targetType: 'user',
      targetId: id,
      targetLabel: updated?.fullName || updated?.email || 'User',
      summary: `User ${updated?.email || updated?.fullName || ''} diblokir.`,
      before: { status: before?.status || null },
      after: { status: updated?.status || 'BANNED' },
      meta: { reason },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Put(':id/unban')
  @AdminPermission('users.manage')
  async unban(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.usersService.getById(id);
    const updated = await this.usersService.unban(id);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_UNBANNED',
      category: 'users',
      targetType: 'user',
      targetId: id,
      targetLabel: updated?.fullName || updated?.email || 'User',
      summary: `Blokir user ${updated?.email || updated?.fullName || ''} dibuka.`,
      before: { status: before?.status || null },
      after: { status: updated?.status || 'ACTIVE' },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Post(':id/reset-password')
  @AdminPermission('users.manage')
  async resetPassword(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string, @Body() body: ResetUserPasswordDto) {
    const target = await this.usersService.getById(id);
    const result = await this.usersService.resetPassword(id, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_PASSWORD_RESET',
      category: 'users',
      targetType: 'user',
      targetId: id,
      targetLabel: target?.fullName || target?.email || 'User',
      summary: `Password user ${target?.email || target?.fullName || ''} direset.`,
      meta: { email: target?.email || null },
      ipAddress: req?.ip,
    });
    return result;
  }

  @Delete(':id')
  @AdminPermission('users.delete')
  async remove(@CurrentUser() user: any, @Req() req: any, @Param('id') id: string) {
    const before = await this.usersService.getById(id);
    const result = await this.usersService.remove(id);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_END_USER_DELETED',
      category: 'users',
      targetType: 'user',
      targetId: id,
      targetLabel: before?.fullName || before?.email || 'User',
      summary: `User ${before?.email || before?.fullName || ''} dihapus.`,
      before: before ? {
        fullName: before.fullName,
        email: before.email,
        phone: before.phone,
        status: before.status,
        paymentStatus: before.paymentStatus,
      } : null,
      ipAddress: req?.ip,
    });
    return result;
  }
}
