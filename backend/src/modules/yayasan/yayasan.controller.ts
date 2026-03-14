import { BadRequestException, Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role, YayasanApprovalStatus } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  encodeWithdrawalNotes,
  mapDisbursementForClient,
  mapUserForClient,
  toClientPaymentStatus,
  toClientTestStatus,
} from 'src/common/mappers/client-shapes';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';

@Controller('yayasan')
export class YayasanController {
  constructor(private readonly prisma: PrismaService) {}

  private async findParentMitra(referredByCode?: string | null) {
    if (!referredByCode) return null;
    return this.prisma.user.findFirst({
      where: {
        role: Role.MITRA,
        OR: [
          { myReferralCode: referredByCode },
          { mitraProfile: { is: { inviteCode: referredByCode } } },
        ],
      },
      include: { mitraProfile: true },
    });
  }

  private buildYayasanView(user: any, extra: Record<string, any> = {}) {
    const approvalStatus = extra.approvalStatus ?? user?.yayasanProfile?.approvalStatus ?? YayasanApprovalStatus.PENDING_MITRA_APPROVAL;
    const isMitraApproved = extra.isMitraApproved ?? approvalStatus === YayasanApprovalStatus.APPROVED;
    const defaultYayasanShare = isMitraApproved ? (extra.yayasanShare ?? user?.yayasanProfile?.referralPrice ?? 0) : 0;
    const derivedMitraShare = isMitraApproved ? (extra.mitraShare ?? user?.yayasanProfile?.mitraShare ?? 0) : 0;
    return mapUserForClient(user, {
      institutionName: user?.yayasanProfile?.institutionName || user?.fullName,
      referralPrice: extra.referralPrice ?? defaultYayasanShare,
      yayasanShare: defaultYayasanShare,
      mitraShare: derivedMitraShare,
      totalPrice: extra.totalPrice ?? (isMitraApproved ? 250000 : 0),
      isVerified: extra.isVerified ?? isMitraApproved,
      isActive: extra.isActive ?? user?.yayasanProfile?.isActive ?? user?.status === 'ACTIVE',
      approvalStatus,
      isMitraApproved,
      referralActive: extra.referralActive ?? (isMitraApproved && (user?.yayasanProfile?.isActive ?? true)),
      approvedAt: extra.approvedAt ?? user?.yayasanProfile?.approvedAt ?? null,
      approvedByMitraId: extra.approvedByMitraId ?? user?.yayasanProfile?.approvedByMitraId ?? null,
      approvalLockedAt: extra.approvalLockedAt ?? user?.yayasanProfile?.approvalLockedAt ?? null,
      ...extra,
    });
  }

  private async computeWalletByReferralCode(referralCode: string, userId?: string) {
    const [sumTx, disbursements] = await Promise.all([
      this.prisma.referralTransaction.aggregate({
        where: { referralCode },
        _sum: { commission: true },
      }),
      this.prisma.disbursement.findMany({
        where: { type: 'yayasan', ...(userId ? { userId } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalCommission = sumTx._sum.commission || 0;
    const approvedOut = disbursements
      .filter((d) => d.status === 'APPROVED')
      .reduce((acc, row) => acc + row.amount, 0);

    return {
      balance: Math.max(totalCommission - approvedOut, 0),
      transactions: disbursements.map((row) => mapDisbursementForClient(row, { yayasanId: row.userId })),
      totalCommission,
      totalDisbursed: approvedOut,
    };
  }

  private async getReferredUsers(referralCode: string) {
    const users = await this.prisma.user.findMany({
      where: { referredByCode: referralCode },
      orderBy: { createdAt: 'desc' },
      include: { profile: true, wallet: true },
    });
    return users.map((user) => this.buildYayasanReferredUser(user));
  }

  private buildYayasanReferredUser(user: any) {
    return mapUserForClient(user, {
      paymentStatus: toClientPaymentStatus(user.paymentStatus),
      freeTestStatus: toClientTestStatus(user.freeTestStatus),
      paidTestStatus: toClientTestStatus(user.paidTestStatus),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Get('me')
  async me(@CurrentUser() user: any) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: { yayasanProfile: true, wallet: true, profile: true },
    });
    const parentMitra = await this.findParentMitra(me?.referredByCode);
    return this.buildYayasanView(me, {
      mitraName: parentMitra?.fullName || null,
      mitraEmail: parentMitra?.email || null,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Get('dashboard/stats')
  async stats(@CurrentUser() user: any) {
    const me = await this.prisma.user.findUnique({ where: { id: user.sub }, include: { yayasanProfile: true } });
    if (!me?.myReferralCode) {
      return { totalUsers: 0, paidUsers: 0, completedTests: 0, pendingPayments: 0, totalRevenue: 0, thisMonthUsers: 0, thisMonthRevenue: 0 };
    }
    if (me.yayasanProfile?.approvalStatus !== YayasanApprovalStatus.APPROVED) {
      return {
        totalUsers: 0,
        paidUsers: 0,
        completedTests: 0,
        pendingPayments: 0,
        totalRevenue: 0,
        thisMonthUsers: 0,
        thisMonthRevenue: 0,
        approvalStatus: me.yayasanProfile?.approvalStatus ?? YayasanApprovalStatus.PENDING_MITRA_APPROVAL,
      };
    }

    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const referredUsers = await this.prisma.user.findMany({
      where: { referredByCode: me.myReferralCode },
      select: { id: true, createdAt: true, paymentStatus: true },
    });
    const referredIds = referredUsers.map((u) => u.id);

    const [completedTests, pendingPayments, revAll, revMonth] = await Promise.all([
      referredIds.length ? this.prisma.testResult.count({ where: { userId: { in: referredIds } } }) : 0,
      referredIds.length ? this.prisma.manualPaymentProof.count({ where: { userId: { in: referredIds }, status: 'PENDING' } }) : 0,
      this.prisma.referralTransaction.aggregate({ where: { referralCode: me.myReferralCode }, _sum: { commission: true } }),
      this.prisma.referralTransaction.aggregate({ where: { referralCode: me.myReferralCode, createdAt: { gte: firstDay } }, _sum: { commission: true } }),
    ]);

    return {
      totalUsers: referredUsers.length,
      paidUsers: referredUsers.filter((u) => ['SUCCESS', 'SETTLEMENT', 'CAPTURE'].includes(String(u.paymentStatus))).length,
      completedTests,
      pendingPayments,
      totalRevenue: revAll._sum.commission || 0,
      thisMonthUsers: referredUsers.filter((u) => u.createdAt >= firstDay).length,
      thisMonthRevenue: revMonth._sum.commission || 0,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Get('users')
  async users(@CurrentUser() user: any) {
    const me = await this.prisma.user.findUnique({ where: { id: user.sub }, include: { yayasanProfile: true } });
    if (me?.yayasanProfile?.approvalStatus !== YayasanApprovalStatus.APPROVED) return [];
    if (!me?.myReferralCode) return [];
    return this.getReferredUsers(me.myReferralCode);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Get('users/:id/detail')
  async userDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const me = await this.prisma.user.findUnique({ where: { id: user.sub }, include: { yayasanProfile: true } });
    if (!me?.myReferralCode || me?.yayasanProfile?.approvalStatus !== YayasanApprovalStatus.APPROVED) {
      throw new BadRequestException('Yayasan referral access is not active');
    }

    const referredUser = await this.prisma.user.findFirst({
      where: { id, referredByCode: me.myReferralCode },
      include: { profile: true, wallet: true, testResults: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!referredUser) {
      throw new BadRequestException('User not found in yayasan scope');
    }

    const latestResult = referredUser.testResults?.[0] || null;
    return {
      ...this.buildYayasanReferredUser(referredUser),
      latestResult: latestResult ? {
        id: latestResult.id,
        dominantElement: latestResult.dominantElement,
        personalityCode: latestResult.personalityCode,
        createdAt: latestResult.createdAt,
      } : null,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Get('test-results')
  async testResults(@CurrentUser() user: any) {
    const me = await this.prisma.user.findUnique({ where: { id: user.sub }, include: { yayasanProfile: true } });
    if (me?.yayasanProfile?.approvalStatus !== YayasanApprovalStatus.APPROVED) return [];
    if (!me?.myReferralCode) return [];

    const referredUsers = await this.prisma.user.findMany({
      where: { referredByCode: me.myReferralCode },
      select: { id: true, fullName: true, email: true },
    });
    const referredMap = new Map(referredUsers.map((u) => [u.id, u]));
    const resultRows = await this.prisma.testResult.findMany({
      where: { userId: { in: referredUsers.map((u) => u.id) } },
      orderBy: { createdAt: 'desc' },
    });

    return resultRows.map((r) => ({
      ...r,
      _id: r.id,
      userName: referredMap.get(r.userId)?.fullName,
      userEmail: referredMap.get(r.userId)?.email,
      analysis: {
        dominantElement: (r.dominantElement || '').toLowerCase(),
        personalityType: r.personalityCode,
        insights: r.freeTeaser,
        aiInsights: r.aiInsights,
      },
      dominantLabel: [r.socialType, r.dominantElement].filter(Boolean).join(' ') || r.personalityCode || '-',
    }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Get('wallet')
  async wallet(@CurrentUser() user: any) {
    const me = await this.prisma.user.findUnique({ where: { id: user.sub }, include: { yayasanProfile: true } });
    if (me?.yayasanProfile?.approvalStatus !== YayasanApprovalStatus.APPROVED) {
      return { balance: 0, transactions: [], totalCommission: 0, totalDisbursed: 0 };
    }
    return this.computeWalletByReferralCode(me?.myReferralCode || '', user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Put('referral-price')
  async referralPrice() {
    throw new BadRequestException('Referral price is managed by mitra approval and admin review');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Post('wallet/withdraw')
  async withdraw(@CurrentUser() user: any, @Body() body: WithdrawRequestDto) {
    const me = await this.prisma.user.findUnique({ where: { id: user.sub } });
    const wallet = await this.computeWalletByReferralCode(me?.myReferralCode || '', user.sub);

    if (body.amount > wallet.balance) {
      throw new BadRequestException('Insufficient yayasan wallet balance');
    }

    const created = await this.prisma.disbursement.create({
      data: {
        type: 'yayasan',
        userId: user.sub,
        amount: Number(body.amount || 0),
        status: 'PENDING',
        notes: encodeWithdrawalNotes(body),
      },
    });

    return mapDisbursementForClient(created, { yayasanId: user.sub });
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async adminList() {
    const rows = await this.prisma.user.findMany({
      where: { role: Role.YAYASAN },
      orderBy: { createdAt: 'desc' },
      include: { yayasanProfile: true, profile: true, wallet: true },
    });

    const parentCodes = [...new Set(rows.map((row) => row.referredByCode).filter(Boolean))];
    const mitraParents = parentCodes.length
      ? await this.prisma.user.findMany({
          where: {
            role: Role.MITRA,
            OR: [
              { myReferralCode: { in: parentCodes as string[] } },
              { mitraProfile: { is: { inviteCode: { in: parentCodes as string[] } } } },
            ],
          },
          include: { mitraProfile: true },
        })
      : [];
    const parentMap = new Map<string, any>();
    for (const parent of mitraParents) {
      if (parent.myReferralCode) parentMap.set(parent.myReferralCode, parent);
      if (parent.mitraProfile?.inviteCode) parentMap.set(parent.mitraProfile.inviteCode, parent);
    }

    return rows.map((row) => this.buildYayasanView(row, {
      mitraName: row.referredByCode ? parentMap.get(row.referredByCode)?.fullName || null : null,
      mitraEmail: row.referredByCode ? parentMap.get(row.referredByCode)?.email || null : null,
    }));
  }

  @Get('admin/:id/detail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async adminDetail(@Param('id') id: string) {
    const yayasan = await this.prisma.user.findUnique({
      where: { id },
      include: { yayasanProfile: true, profile: true, wallet: true },
    });
    const parentMitra = await this.findParentMitra(yayasan?.referredByCode);
    const users = (yayasan?.myReferralCode ? await this.getReferredUsers(yayasan.myReferralCode) : []).filter(Boolean);
    const totalRevenue = yayasan?.myReferralCode
      ? (await this.prisma.referralTransaction.aggregate({
          where: { referralCode: yayasan.myReferralCode },
          _sum: { commission: true },
        }))._sum.commission || 0
      : 0;

    return this.buildYayasanView(yayasan, {
      mitraName: parentMitra?.fullName || null,
      mitraEmail: parentMitra?.email || null,
      users,
      stats: {
        totalRegistered: users.length,
        sudahTes: users.filter((u: any) => u.paidTestStatus === 'completed').length,
        sudahBayarBelumTes: users.filter((u: any) => u.paymentStatus === 'approved' && u.paidTestStatus !== 'completed').length,
        belumBayar: users.filter((u: any) => u.paymentStatus !== 'approved').length,
      },
      totalRevenue,
      yayasanRevenue: totalRevenue,
    });
  }

  @Put('admin/:id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async toggleActive(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, include: { yayasanProfile: true, profile: true, wallet: true } });
    const nextActive = !(row?.yayasanProfile?.isActive ?? row?.status === 'ACTIVE');
    await this.prisma.yayasanProfile.upsert({
      where: { userId: id },
      create: { userId: id, institutionName: row?.fullName || 'Yayasan', isActive: nextActive, referralPrice: 0 },
      update: { isActive: nextActive },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: { status: nextActive ? 'ACTIVE' : 'INACTIVE' }, include: { yayasanProfile: true, profile: true, wallet: true } });
    return this.buildYayasanView(updated);
  }

  @Put('admin/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async verify(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, include: { yayasanProfile: true, profile: true, wallet: true } });
    await this.prisma.yayasanProfile.upsert({
      where: { userId: id },
      create: { userId: id, institutionName: row?.fullName || 'Yayasan', isVerified: true, isActive: true, referralPrice: 0 },
      update: { isVerified: true, isActive: true },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' }, include: { yayasanProfile: true, profile: true, wallet: true } });
    return this.buildYayasanView(updated);
  }

  @Get('admin/withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async withdrawals() {
    const rows = await this.prisma.disbursement.findMany({ where: { type: 'yayasan' }, orderBy: { createdAt: 'desc' } });
    const users = rows.length
      ? await this.prisma.user.findMany({
          where: { id: { in: rows.map((row) => row.userId).filter(Boolean) as string[] } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item]));

    return rows.map((row) => mapDisbursementForClient(row, {
      yayasanName: row.userId ? userMap.get(row.userId)?.fullName || 'Yayasan' : 'Yayasan',
      yayasanEmail: row.userId ? userMap.get(row.userId)?.email || null : null,
    }));
  }

  @Put('admin/withdrawals/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async approveWithdrawal(@Param('id') id: string, @Body() body: ProcessWithdrawalDto) {
    const updated = await this.prisma.disbursement.update({
      where: { id },
      data: { status: body.status === 'REJECTED' ? 'REJECTED' : 'APPROVED', notes: body.notes || undefined, processedAt: new Date() },
    });
    return mapDisbursementForClient(updated);
  }

  @Put('admin/withdrawals/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async rejectWithdrawal(@Param('id') id: string, @Body() body: ProcessWithdrawalDto) {
    const updated = await this.prisma.disbursement.update({
      where: { id },
      data: { status: 'REJECTED', notes: body.notes || undefined, processedAt: new Date() },
    });
    return mapDisbursementForClient(updated);
  }
}
