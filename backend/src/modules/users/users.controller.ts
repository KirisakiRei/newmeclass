import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
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
  constructor(private readonly usersService: UsersService) {}

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
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Put(':id/status')
  @AdminPermission('users.manage')
  updateStatus(@Param('id') id: string, @Query() query: UserStatusQueryDto) {
    const { status } = query;
    return this.usersService.updateStatus(id, status);
  }

  @Put(':id/ban')
  @AdminPermission('users.manage')
  ban(@Param('id') id: string, @Query() query: BanUserQueryDto) {
    const reason = query.reason || 'Pelanggaran aturan';
    return this.usersService.ban(id, reason);
  }

  @Put(':id/unban')
  @AdminPermission('users.manage')
  unban(@Param('id') id: string) {
    return this.usersService.unban(id);
  }

  @Post(':id/reset-password')
  @AdminPermission('users.manage')
  resetPassword(@Param('id') id: string, @Body() body: ResetUserPasswordDto) {
    return this.usersService.resetPassword(id, body);
  }

  @Delete(':id')
  @AdminPermission('users.delete')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
