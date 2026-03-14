import { BadRequestException, Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PriceChangeRequestStatus, Role, YayasanApprovalStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
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
import { ApproveYayasanDto } from './dto/approve-yayasan.dto';
import { CreatePriceChangeRequestDto } from './dto/create-price-change-request.dto';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';
import { ReviewPriceChangeRequestDto } from './dto/review-price-change-request.dto';
import { UpdateMitraYayasanPriceDto } from './dto/update-mitra-yayasan-price.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';

type PriceMapEntry = {
  referralPrice: number;
  totalPrice: number;
  mitraShare: number;
  yayasanShare: number;
};

const REFERRAL_TOTAL_PRICE = 250000;
const REFERRAL_SHARE_BUDGET = 150000;

@Controller('mitra')
export class MitraController {
  constructor(private readonly prisma: PrismaService) {}

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async getPriceMap() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'mitraYayasanPriceMap' } });
    return (row?.value as Record<string, number | PriceMapEntry>) || {};
  }

  private normalizePriceEntry(value?: number | Partial<PriceMapEntry> | null): PriceMapEntry {
    if (typeof value === 'number') {
      const yayasanShare = Math.max(Math.min(value, REFERRAL_SHARE_BUDGET), 0);
      return {
        referralPrice: yayasanShare,
        yayasanShare,
        mitraShare: REFERRAL_SHARE_BUDGET - yayasanShare,
        totalPrice: REFERRAL_TOTAL_PRICE,
      };
    }

    const yayasanShare = Math.max(Math.min(value?.yayasanShare ?? value?.referralPrice ?? 0, REFERRAL_SHARE_BUDGET), 0);
    const mitraShare = Math.max(
      Math.min(value?.mitraShare ?? (REFERRAL_SHARE_BUDGET - yayasanShare), REFERRAL_SHARE_BUDGET - yayasanShare),
      0,
    );

    return {
      referralPrice: yayasanShare,
      yayasanShare,
      mitraShare,
      totalPrice: REFERRAL_TOTAL_PRICE,
    };
  }

  private async setPriceMap(map: Record<string, number | PriceMapEntry>) {
    return this.prisma.setting.upsert({
      where: { key: 'mitraYayasanPriceMap' },
      create: { key: 'mitraYayasanPriceMap', value: map },
      update: { value: map },
    });
  }

  private async computeMitraWallet(refCode: string, userId?: string) {
    const [sumTx, disbursements] = await Promise.all([
      this.prisma.referralTransaction.aggregate({ where: { referralCode: refCode }, _sum: { commission: true } }),
      this.prisma.disbursement.findMany({
        where: { type: 'mitra', ...(userId ? { userId } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const revenue = sumTx._sum.commission || 0;
    const out = disbursements.filter((d) => d.status === 'APPROVED').reduce((acc, d) => acc + d.amount, 0);
    return {
      balance: Math.max(revenue - out, 0),
      transactions: disbursements.map((row) => mapDisbursementForClient(row)),
      totalRevenue: revenue,
      totalDisbursed: out,
    };
  }

  private buildMitraView(user: any, extra: Record<string, any> = {}) {
    return mapUserForClient(user, {
      inviteCode: extra.inviteCode ?? user?.mitraProfile?.inviteCode ?? user?.myReferralCode ?? null,
      isVerified: extra.isVerified ?? user?.mitraProfile?.isVerified ?? user?.status === 'ACTIVE',
      isActive: extra.isActive ?? user?.mitraProfile?.isActive ?? user?.status === 'ACTIVE',
      ...extra,
    });
  }

  private async getManagedYayasanCode(mitraUserId: string) {
    const me = await this.prisma.user.findUnique({ where: { id: mitraUserId }, include: { mitraProfile: true } });
    return me?.mitraProfile?.inviteCode || me?.myReferralCode || '';
  }

  private async getManagedYayasanBase(mitraUserId: string, yayasanId: string) {
    const code = await this.getManagedYayasanCode(mitraUserId);
    const yayasan = await this.prisma.user.findFirst({
      where: { id: yayasanId, role: Role.YAYASAN, referredByCode: code },
      include: { yayasanProfile: true, profile: true, wallet: true },
    });
    if (!yayasan) {
      throw new BadRequestException('Yayasan not managed by this mitra');
    }
    return yayasan;
  }

  private async getYayasanPricing(mitraUserId: string, yayasan: any) {
    const explicit = this.normalizePriceEntry({
      referralPrice: yayasan?.yayasanProfile?.referralPrice ?? 0,
      mitraShare: yayasan?.yayasanProfile?.mitraShare ?? 0,
    });
    if ((explicit.yayasanShare > 0 || explicit.mitraShare > 0) || yayasan?.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED) {
      return explicit;
    }

    const map = await this.getPriceMap();
    const legacy = map[`${mitraUserId}:${yayasan.id}`];
    return this.normalizePriceEntry(legacy ?? 0);
  }

  private async buildManagedYayasanView(mitraUserId: string, yayasan: any) {
    const pricing = await this.getYayasanPricing(mitraUserId, yayasan);
    const users = yayasan.myReferralCode
      ? await this.prisma.user.findMany({
          where: { referredByCode: yayasan.myReferralCode },
          orderBy: { createdAt: 'desc' },
          include: { profile: true, wallet: true },
        })
      : [];
    const totalCommission = yayasan.myReferralCode
      ? (await this.prisma.referralTransaction.aggregate({
          where: { referralCode: yayasan.myReferralCode },
          _sum: { commission: true },
        }))._sum.commission || 0
      : 0;

    return mapUserForClient(yayasan, {
      referralCode: yayasan.myReferralCode,
      usersCount: users.length,
      totalCommission,
      referralPrice: yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED ? pricing.yayasanShare : 0,
      yayasanShare: yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED ? pricing.yayasanShare : 0,
      mitraShare: yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED ? pricing.mitraShare : 0,
      totalPrice: yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED ? REFERRAL_TOTAL_PRICE : 0,
      approvalStatus: yayasan.yayasanProfile?.approvalStatus ?? YayasanApprovalStatus.PENDING_MITRA_APPROVAL,
      isMitraApproved: yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED,
      referralActive:
        yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED
        && (yayasan.yayasanProfile?.isActive ?? true),
      approvedAt: yayasan.yayasanProfile?.approvedAt ?? null,
      approvedByMitraId: yayasan.yayasanProfile?.approvedByMitraId ?? null,
      approvalLockedAt: yayasan.yayasanProfile?.approvalLockedAt ?? null,
      institutionName: yayasan.yayasanProfile?.institutionName || yayasan.fullName,
      users: users.map((item) => mapUserForClient(item)),
    });
  }

  private mapPriceChangeRequest(row: any, extra: Record<string, any> = {}) {
    return {
      ...row,
      ...extra,
      _id: row.id,
      id: row.id,
      status: String(row.status || '').toLowerCase(),
      currentTotalPrice: REFERRAL_TOTAL_PRICE,
      requestedTotalPrice: REFERRAL_TOTAL_PRICE,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('me')
  async me(@CurrentUser() user: any) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: { mitraProfile: true, wallet: true, profile: true },
    });
    return this.buildMitraView(me);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('dashboard/stats')
  async stats(@CurrentUser() user: any) {
    const code = await this.getManagedYayasanCode(user.sub);
    const yayasan = await this.prisma.user.findMany({
      where: { role: Role.YAYASAN, referredByCode: code },
      select: { myReferralCode: true, yayasanProfile: true },
    });
    const referralCodes = yayasan.map((item) => item.myReferralCode).filter(Boolean) as string[];
    const users = referralCodes.length
      ? await this.prisma.user.count({ where: { referredByCode: { in: referralCodes } } })
      : 0;
    const wallet = await this.computeMitraWallet(code, user.sub);

    return {
      totalYayasan: yayasan.length,
      totalApprovedYayasan: yayasan.filter((item) => item.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED).length,
      totalPendingYayasan: yayasan.filter((item) => item.yayasanProfile?.approvalStatus !== YayasanApprovalStatus.APPROVED).length,
      totalUsers: users,
      totalEarnings: wallet.totalRevenue,
      walletBalance: wallet.balance,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('stats')
  statsLegacy(@CurrentUser() user: any) {
    return this.stats(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('yayasan')
  async yayasanList(@CurrentUser() user: any) {
    const code = await this.getManagedYayasanCode(user.sub);
    const list = await this.prisma.user.findMany({
      where: { role: Role.YAYASAN, referredByCode: code },
      include: { yayasanProfile: true, profile: true, wallet: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(list.map((item) => this.buildManagedYayasanView(user.sub, item)));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('yayasan/:id/detail')
  async yayasanDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const yayasan = await this.getManagedYayasanBase(user.sub, id);
    const mapped: any = await this.buildManagedYayasanView(user.sub, yayasan);
    const users = ((mapped?.users as any[]) || []).map((item: any) => ({
      ...item,
      paymentStatus: item.paymentStatus,
      paidTestStatus: item.paidTestStatus,
    }));

    return {
      ...mapped,
      users,
      stats: {
        totalRegistered: users.length,
        sudahTes: users.filter((item: any) => item.paidTestStatus === 'completed').length,
        sudahBayarBelumTes:
          users.filter((item: any) => item.paymentStatus === 'approved' && item.paidTestStatus !== 'completed').length,
        belumBayar: users.filter((item: any) => item.paymentStatus !== 'approved').length,
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Post('yayasan/:id/approve')
  async approveYayasan(@CurrentUser() user: any, @Param('id') id: string, @Body() body: ApproveYayasanDto) {
    const yayasan = await this.getManagedYayasanBase(user.sub, id);
    if (yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED) {
      throw new BadRequestException('Yayasan already approved');
    }

    const pricing = this.normalizePriceEntry({ yayasanShare: Number(body.yayasanShare || 0) });
    await this.prisma.yayasanProfile.update({
      where: { userId: yayasan.id },
      data: {
        referralPrice: pricing.yayasanShare,
        mitraShare: pricing.mitraShare,
        approvalStatus: YayasanApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvedByMitraId: user.sub,
        approvalLockedAt: new Date(),
        isActive: true,
      },
    });

    const fresh = await this.getManagedYayasanBase(user.sub, id);
    return this.buildManagedYayasanView(user.sub, fresh);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Put('yayasan/:id/price')
  async setPrice(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateMitraYayasanPriceDto) {
    const yayasan = await this.getManagedYayasanBase(user.sub, id);
    if (yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED) {
      throw new BadRequestException('Direct price edit disabled. Please submit a price change request.');
    }
    return this.approveYayasan(user, id, { yayasanShare: Number(body.yayasanShare ?? body.referralPrice ?? 0) });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Post('yayasan/:id/price-change-requests')
  async createPriceChangeRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: CreatePriceChangeRequestDto,
  ) {
    const yayasan = await this.getManagedYayasanBase(user.sub, id);
    if (yayasan.yayasanProfile?.approvalStatus !== YayasanApprovalStatus.APPROVED) {
      throw new BadRequestException('Yayasan must be approved before requesting a price change');
    }

    const existingPending = await this.prisma.yayasanPriceChangeRequest.findFirst({
      where: { mitraId: user.sub, yayasanId: id, status: PriceChangeRequestStatus.PENDING },
    });
    if (existingPending) {
      throw new BadRequestException('There is already a pending price change request for this yayasan');
    }

    const pricing = this.normalizePriceEntry({ yayasanShare: Number(body.requestedYayasanShare || 0) });
    const created = await this.prisma.yayasanPriceChangeRequest.create({
      data: {
        mitraId: user.sub,
        yayasanId: id,
        currentYayasanShare: yayasan.yayasanProfile?.referralPrice ?? 0,
        currentMitraShare: yayasan.yayasanProfile?.mitraShare ?? 0,
        requestedYayasanShare: pricing.yayasanShare,
        requestedMitraShare: pricing.mitraShare,
        reason: body.reason,
      },
    });

    return this.mapPriceChangeRequest(created, {
      yayasanName: yayasan.fullName,
      yayasanEmail: yayasan.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('price-change-requests')
  async priceChangeRequests(@CurrentUser() user: any) {
    const rows = await this.prisma.yayasanPriceChangeRequest.findMany({
      where: { mitraId: user.sub },
      orderBy: { createdAt: 'desc' },
    });
    const yayasanIds = [...new Set(rows.map((item) => item.yayasanId))];
    const yayasanRows = yayasanIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: yayasanIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const yayasanMap = new Map(yayasanRows.map((item) => [item.id, item]));

    return rows.map((row) =>
      this.mapPriceChangeRequest(row, {
        yayasanName: yayasanMap.get(row.yayasanId)?.fullName || 'Yayasan',
        yayasanEmail: yayasanMap.get(row.yayasanId)?.email || null,
      }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('wallet')
  async wallet(@CurrentUser() user: any) {
    const code = await this.getManagedYayasanCode(user.sub);
    return this.computeMitraWallet(code, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Post('wallet/withdraw')
  async withdrawWallet(@CurrentUser() user: any, @Body() body: WithdrawRequestDto) {
    const code = await this.getManagedYayasanCode(user.sub);
    const wallet = await this.computeMitraWallet(code, user.sub);
    if (body.amount > wallet.balance) throw new BadRequestException('Insufficient mitra wallet balance');

    const created = await this.prisma.disbursement.create({
      data: {
        type: 'mitra',
        userId: user.sub,
        amount: Number(body.amount),
        status: 'PENDING',
        notes: encodeWithdrawalNotes(body),
      },
    });

    return mapDisbursementForClient(created);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Post('withdraw')
  withdrawAlias(@CurrentUser() user: any, @Body() body: WithdrawRequestDto) {
    return this.withdrawWallet(user, body);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async adminList() {
    const rows = await this.prisma.user.findMany({
      where: { role: Role.MITRA },
      orderBy: { createdAt: 'desc' },
      include: { mitraProfile: true, profile: true, wallet: true },
    });

    return Promise.all(rows.map(async (row) => {
      const code = row.mitraProfile?.inviteCode || row.myReferralCode || '';
      const yayasanCount = code
        ? await this.prisma.user.count({ where: { role: Role.YAYASAN, referredByCode: code } })
        : 0;
      return this.buildMitraView(row, { yayasanCount });
    }));
  }

  @Get('admin/:id/detail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async adminDetail(@Param('id') id: string) {
    const mitra = await this.prisma.user.findUnique({
      where: { id },
      include: { mitraProfile: true, profile: true, wallet: true },
    });
    const code = mitra?.mitraProfile?.inviteCode || mitra?.myReferralCode || '';
    const yayasanRows = code
      ? await this.prisma.user.findMany({
          where: { role: Role.YAYASAN, referredByCode: code },
          include: { yayasanProfile: true, profile: true, wallet: true },
        })
      : [];
    const yayasanDetails = await Promise.all(yayasanRows.map((yayasan) => this.buildManagedYayasanView(id, yayasan)));

    return this.buildMitraView(mitra, {
      totalYayasan: yayasanDetails.length,
      totalUsers: yayasanDetails.reduce((sum, item: any) => sum + (item.usersCount || 0), 0),
      totalRevenue: yayasanDetails.reduce((sum, item: any) => sum + (item.totalCommission || 0), 0),
      yayasanDetails,
    });
  }

  @Get('admin/price-change-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async adminPriceChangeRequests() {
    const rows = await this.prisma.yayasanPriceChangeRequest.findMany({ orderBy: { createdAt: 'desc' } });
    const mitraIds = [...new Set(rows.map((item) => item.mitraId))];
    const yayasanIds = [...new Set(rows.map((item) => item.yayasanId))];
    const [mitraRows, yayasanRows] = await Promise.all([
      mitraIds.length
        ? this.prisma.user.findMany({ where: { id: { in: mitraIds } }, select: { id: true, fullName: true, email: true } })
        : [],
      yayasanIds.length
        ? this.prisma.user.findMany({ where: { id: { in: yayasanIds } }, select: { id: true, fullName: true, email: true } })
        : [],
    ]);
    const mitraMap = new Map<string, { id: string; fullName: string | null; email: string | null }>(
      mitraRows.map((item) => [item.id, item] as [string, { id: string; fullName: string | null; email: string | null }]),
    );
    const yayasanMap = new Map<string, { id: string; fullName: string | null; email: string | null }>(
      yayasanRows.map((item) => [item.id, item] as [string, { id: string; fullName: string | null; email: string | null }]),
    );

    return rows.map((row) =>
      this.mapPriceChangeRequest(row, {
        mitraName: mitraMap.get(row.mitraId)?.fullName || 'Mitra',
        mitraEmail: mitraMap.get(row.mitraId)?.email || null,
        yayasanName: yayasanMap.get(row.yayasanId)?.fullName || 'Yayasan',
        yayasanEmail: yayasanMap.get(row.yayasanId)?.email || null,
      }),
    );
  }

  @Put('admin/price-change-requests/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async reviewPriceChangeRequest(@CurrentUser() user: any, @Param('id') id: string, @Body() body: ReviewPriceChangeRequestDto) {
    const request = await this.prisma.yayasanPriceChangeRequest.findUnique({ where: { id } });
    if (!request) {
      throw new BadRequestException('Price change request not found');
    }
    if (request.status !== PriceChangeRequestStatus.PENDING) {
      throw new BadRequestException('Price change request has already been reviewed');
    }

    const nextStatus = body.status === 'APPROVED' ? PriceChangeRequestStatus.APPROVED : PriceChangeRequestStatus.REJECTED;
    const updated = await this.prisma.$transaction(async (tx) => {
      const reviewed = await tx.yayasanPriceChangeRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          reviewedBy: user.sub,
          reviewedAt: new Date(),
          reviewNote: body.reviewNote || null,
          appliedAt: nextStatus === PriceChangeRequestStatus.APPROVED ? new Date() : null,
        },
      });

      if (nextStatus === PriceChangeRequestStatus.APPROVED) {
        await tx.yayasanProfile.update({
          where: { userId: request.yayasanId },
          data: {
            referralPrice: request.requestedYayasanShare,
            mitraShare: request.requestedMitraShare,
          },
        });
      }

      return reviewed;
    });

    return this.mapPriceChangeRequest(updated);
  }

  @Put('admin/:id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async toggleActive(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, include: { mitraProfile: true, profile: true, wallet: true } });
    const nextActive = !(row?.mitraProfile?.isActive ?? row?.status === 'ACTIVE');
    await this.prisma.mitraProfile.upsert({
      where: { userId: id },
      create: { userId: id, inviteCode: row?.myReferralCode || row?.mitraProfile?.inviteCode || 'M00000', isActive: nextActive },
      update: { isActive: nextActive },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: { status: nextActive ? 'ACTIVE' : 'INACTIVE' }, include: { mitraProfile: true, profile: true, wallet: true } });
    return this.buildMitraView(updated);
  }

  @Put('admin/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async verify(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, include: { mitraProfile: true, profile: true, wallet: true } });
    await this.prisma.mitraProfile.upsert({
      where: { userId: id },
      create: { userId: id, inviteCode: row?.myReferralCode || row?.mitraProfile?.inviteCode || 'M00000', isVerified: true, isActive: true },
      update: { isVerified: true, isActive: true },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' }, include: { mitraProfile: true, profile: true, wallet: true } });
    return this.buildMitraView(updated);
  }

  @Post('admin/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async resetPassword(@Param('id') id: string) {
    const nextPassword = `Reset-${randomBytes(4).toString('hex')}`;
    await this.prisma.user.update({ where: { id }, data: { passwordHash: this.hash(nextPassword) } });
    return { message: 'Password reset success. Temporary password generated and stored securely.' };
  }

  @Get('admin/withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async withdrawals() {
    const rows = await this.prisma.disbursement.findMany({ where: { type: 'mitra' }, orderBy: { createdAt: 'desc' } });
    const users = rows.length
      ? await this.prisma.user.findMany({
          where: { id: { in: rows.map((row) => row.userId).filter(Boolean) as string[] } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item]));

    return rows.map((row) => mapDisbursementForClient(row, {
      mitraName: row.userId ? userMap.get(row.userId)?.fullName || 'Mitra' : 'Mitra',
      mitraEmail: row.userId ? userMap.get(row.userId)?.email || null : null,
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
  rejectWithdrawal(@Param('id') id: string, @Body() body: ProcessWithdrawalDto) {
    return this.approveWithdrawal(id, { ...body, status: 'REJECTED' });
  }
}
