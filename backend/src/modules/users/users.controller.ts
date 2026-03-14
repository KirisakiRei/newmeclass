import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersService } from './users.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatusQueryDto } from './dto/user-status-query.dto';
import { BanUserQueryDto } from './dto/ban-user-query.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getAll(@Query() query: UsersQueryDto) {
    return this.usersService.getAll(query);
  }

  @Get('stats/summary')
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Query() query: UserStatusQueryDto) {
    const { status } = query;
    return this.usersService.updateStatus(id, status);
  }

  @Put(':id/ban')
  ban(@Param('id') id: string, @Query() query: BanUserQueryDto) {
    const reason = query.reason || 'Pelanggaran aturan';
    return this.usersService.ban(id, reason);
  }

  @Put(':id/unban')
  unban(@Param('id') id: string) {
    return this.usersService.unban(id);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: ResetUserPasswordDto) {
    return this.usersService.resetPassword(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
