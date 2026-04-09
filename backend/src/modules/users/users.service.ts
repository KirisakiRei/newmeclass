import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, PaymentStatus, Prisma, Role, TestStatus } from '@prisma/client';
import { mapUserForClient, toClientPaymentStatus } from 'src/common/mappers/client-shapes';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private readonly endUserWhere: Prisma.UserWhereInput = {
    role: Role.USER,
  };

  private async getEndUserOrThrow(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.USER,
      },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async getAll(query: UsersQueryDto) {
    const where: Prisma.UserWhereInput = { ...this.endUserWhere };
    if (query?.status) where.status = query.status;
    if (query?.isBanned === 'true') where.status = AccountStatus.BANNED;
    if (query?.paymentStatus === 'approved') {
      where.paymentStatus = { in: [PaymentStatus.SUCCESS, PaymentStatus.SETTLEMENT, PaymentStatus.CAPTURE] };
    } else if (query?.paymentStatus === 'pending') {
      where.paymentStatus = PaymentStatus.PENDING;
    } else if (query?.paymentStatus === 'unpaid') {
      where.paymentStatus = { in: [PaymentStatus.CREATED, PaymentStatus.FAILURE, PaymentStatus.REJECTED, PaymentStatus.EXPIRE, PaymentStatus.CANCEL, PaymentStatus.DENY] };
    }
    if (query?.search) {
      where.OR = [
        { fullName: { contains: query.search } },
        { email: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    const { page, pageSize, skip, take } = resolvePagination(query, { pageSize: 10, maxPageSize: 100 });

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { profile: true, wallet: true },
      }),
    ]);

    const items = users.map((user) => mapUserForClient(user, {
      address: user.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).address || null : null,
      userType: user.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).userType || null : null,
    }));

    return buildPaginatedResult(items, total, page, pageSize);
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const baseWhere = this.endUserWhere;

    const [total, active, banned, paid, newToday] = await Promise.all([
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.user.count({ where: { ...baseWhere, status: AccountStatus.ACTIVE } }),
      this.prisma.user.count({ where: { ...baseWhere, status: AccountStatus.BANNED } }),
      this.prisma.user.count({ where: { ...baseWhere, paymentStatus: { in: [PaymentStatus.SUCCESS, PaymentStatus.SETTLEMENT, PaymentStatus.CAPTURE] } } }),
      this.prisma.user.count({ where: { ...baseWhere, createdAt: { gte: today } } }),
    ]);

    return { total, active, banned, paid, newToday };
  }

  async getById(id: string) {
    const user = await this.getEndUserOrThrow(id);
    return mapUserForClient(user, {
      address: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).address || null : null,
      institutionName: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).institutionName || null : null,
      institutionAddress: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).institutionAddress || null : null,
      position: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).position || null : null,
      userType: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).userType || null : null,
    });
  }

  async update(id: string, body: UpdateUserDto) {
    const existing = await this.getEndUserOrThrow(id);
    const existingExtra =
      existing?.profile?.extra && typeof existing.profile.extra === 'object'
        ? (existing.profile.extra as Record<string, any>)
        : {};

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: body.fullName,
        email: body.email,
        phone: body.phone || body.whatsapp,
        status: body.status as AccountStatus | undefined,
        paymentStatus: body.paymentStatus
          ? (body.paymentStatus === 'approved'
              ? PaymentStatus.SUCCESS
              : body.paymentStatus === 'pending'
                ? PaymentStatus.PENDING
                : body.paymentStatus === 'rejected'
                  ? PaymentStatus.REJECTED
                  : PaymentStatus.CREATED)
          : undefined,
        freeTestStatus: body.freeTestStatus
          ? (body.freeTestStatus.toUpperCase() as TestStatus)
          : undefined,
        paidTestStatus: body.paidTestStatus
          ? (body.paidTestStatus.toUpperCase() as TestStatus)
          : undefined,
        profile: {
          upsert: {
            create: {
              birthDate: body.birthDate ? new Date(body.birthDate) : null,
              province: body.province || null,
              city: body.city || null,
              district: body.district || null,
              village: body.village || null,
              extra: {
                ...existingExtra,
                address: body.address ?? existingExtra.address ?? null,
                userType: body.userType ?? existingExtra.userType ?? null,
              },
            },
            update: {
              birthDate: body.birthDate ? new Date(body.birthDate) : null,
              province: body.province || null,
              city: body.city || null,
              district: body.district || null,
              village: body.village || null,
              extra: {
                ...existingExtra,
                address: body.address ?? existingExtra.address ?? null,
                userType: body.userType ?? existingExtra.userType ?? null,
              },
            },
          },
        },
      },
      include: { profile: true, wallet: true },
    });

    return mapUserForClient(updated, {
      address: body.address || null,
      userType: body.userType || null,
    });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.user.updateMany({
      where: { id, role: Role.USER },
      data: { status: status as AccountStatus },
    }).then((result) => {
      if (!result.count) {
        throw new NotFoundException('User tidak ditemukan');
      }
      return this.getEndUserOrThrow(id);
    });
  }

  ban(id: string, _reason: string) {
    return this.prisma.user.updateMany({
      where: { id, role: Role.USER },
      data: { status: AccountStatus.BANNED },
    }).then((result) => {
      if (!result.count) {
        throw new NotFoundException('User tidak ditemukan');
      }
      return this.getEndUserOrThrow(id);
    });
  }

  unban(id: string) {
    return this.prisma.user.updateMany({
      where: { id, role: Role.USER },
      data: { status: AccountStatus.ACTIVE },
    }).then((result) => {
      if (!result.count) {
        throw new NotFoundException('User tidak ditemukan');
      }
      return this.getEndUserOrThrow(id);
    });
  }

  async resetPassword(id: string, body: ResetUserPasswordDto) {
    void body;
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.USER },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return this.authService.requestPasswordResetByUserId(id, Role.USER);
  }

  async remove(id: string) {
    const result = await this.prisma.user.deleteMany({
      where: { id, role: Role.USER },
    });
    if (!result.count) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return { message: 'User deleted' };
  }
}
