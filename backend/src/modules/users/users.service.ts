import { Injectable } from '@nestjs/common';
import { AccountStatus, PaymentStatus, Prisma, Role, TestStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { mapUserForClient, toClientPaymentStatus } from 'src/common/mappers/client-shapes';
import { PrismaService } from '../prisma/prisma.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  async getAll(query: UsersQueryDto) {
    const where: Prisma.UserWhereInput = {};
    if (query?.role && Object.values(Role).includes(query.role as Role)) where.role = query.role as Role;
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

    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 100), 1), 500);

    const users = await this.prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { profile: true, wallet: true },
    });

    return users.map((user) => mapUserForClient(user, {
      address: user.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).address || null : null,
      userType: user.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).userType || null : null,
    }));
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, active, banned, paid, newToday] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: AccountStatus.ACTIVE } }),
      this.prisma.user.count({ where: { status: AccountStatus.BANNED } }),
      this.prisma.user.count({ where: { paymentStatus: { in: [PaymentStatus.SUCCESS, PaymentStatus.SETTLEMENT, PaymentStatus.CAPTURE] } } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
    ]);

    return { total, active, banned, paid, newToday };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { profile: true, wallet: true } });
    return mapUserForClient(user, {
      address: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).address || null : null,
      institutionName: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).institutionName || null : null,
      institutionAddress: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).institutionAddress || null : null,
      position: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).position || null : null,
      userType: user?.profile?.extra && typeof user.profile.extra === 'object' ? (user.profile.extra as Record<string, any>).userType || null : null,
    });
  }

  async update(id: string, body: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
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
    return this.prisma.user.update({ where: { id }, data: { status: status as AccountStatus } });
  }

  ban(id: string, _reason: string) {
    return this.prisma.user.update({ where: { id }, data: { status: AccountStatus.BANNED } });
  }

  unban(id: string) {
    return this.prisma.user.update({ where: { id }, data: { status: AccountStatus.ACTIVE } });
  }

  async resetPassword(id: string, body: ResetUserPasswordDto) {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: this.hash(body?.newPassword || 'Reset123!') },
    });

    return { message: 'Password reset success. Temporary password has been applied.' };
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }
}
