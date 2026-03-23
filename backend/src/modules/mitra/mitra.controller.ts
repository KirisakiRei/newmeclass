import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AccountStatus, MitraInviteStatus, PriceChangeRequestStatus, Role, YayasanApprovalStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  encodeWithdrawalNotes,
  mapDisbursementForClient,
  mapUserForClient,
  parseWithdrawalNotes,
  toClientPaymentStatus,
  toClientTestStatus,
} from 'src/common/mappers/client-shapes';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { DisbursementsService } from '../disbursements/disbursements.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveYayasanDto } from './dto/approve-yayasan.dto';
import { CreateMitraInviteDto } from './dto/create-mitra-invite.dto';
import { CreatePriceChangeRequestDto } from './dto/create-price-change-request.dto';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';
import { ReviewPriceChangeRequestDto } from './dto/review-price-change-request.dto';
import { UpdateMitraCapacityDto } from './dto/update-mitra-capacity.dto';
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
const DEFAULT_MITRA_CAPACITY_LIMIT = 35;
const MITRA_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MITRA_PLACEHOLDER_EMAIL_DOMAIN = 'pending-mitra.newme.local';

@Controller('mitra')
export class MitraController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disbursementsService: DisbursementsService,
  ) {}

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private normalizeEmail(value?: string | null) {
    return String(value || '').trim().toLowerCase();
  }

  private normalizePhone(value?: string | null) {
    const normalized = String(value || '').replace(/\s+/g, '').trim();
    return normalized || null;
  }

  private isPlaceholderEmail(email?: string | null) {
    return String(email || '').trim().toLowerCase().endsWith(`@${MITRA_PLACEHOLDER_EMAIL_DOMAIN}`);
  }

  private buildPendingMitraEmail(publicCode: string) {
    return `mitra-${String(publicCode || '').trim().toLowerCase()}@${MITRA_PLACEHOLDER_EMAIL_DOMAIN}`;
  }

  private getFrontendBaseUrl() {
    const fallbackOrigin = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .find(Boolean);
    return String(process.env.FRONTEND_URL || fallbackOrigin || 'http://localhost:5173').replace(/\/+$/, '');
  }

  private buildFrontendUrl(path: string, params?: Record<string, string | null | undefined>) {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, `${this.getFrontendBaseUrl()}/`);
    Object.entries(params || {}).forEach(([key, rawValue]) => {
      const value = String(rawValue || '').trim();
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  private async generateUniqueMitraBusinessCode() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const code = `M${randomBytes(3).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.user.findFirst({
        where: { myReferralCode: code },
        select: { id: true },
      });
      if (!exists) {
        return code;
      }
    }
    throw new BadRequestException('Unable to generate mitra code');
  }

  private managedYayasanWhere(mitraUserId: string, inviteCode?: string | null) {
    const code = String(inviteCode || '').trim();
    return {
      role: Role.YAYASAN,
      OR: [
        { yayasanProfile: { is: { managedByMitraId: mitraUserId } } },
        ...(code ? [{ referredByCode: code }] : []),
      ],
    };
  }

  private resolveInviteStatus(invite?: any) {
    if (!invite) return null;
    if (invite.status === MitraInviteStatus.PENDING && invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return MitraInviteStatus.EXPIRED;
    }
    return invite.status || null;
  }

  private async getLatestInvite(userId: string) {
    const invite = await this.prisma.mitraInvite.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (invite && this.resolveInviteStatus(invite) === MitraInviteStatus.EXPIRED && invite.status !== MitraInviteStatus.EXPIRED) {
      return this.prisma.mitraInvite.update({
        where: { id: invite.id },
        data: { status: MitraInviteStatus.EXPIRED },
      });
    }
    return invite;
  }

  private buildInviteView(invite: any, plainToken?: string | null) {
    return {
      id: invite?.id || null,
      status: this.resolveInviteStatus(invite),
      sentAt: invite?.sentAt || invite?.createdAt || null,
      expiresAt: invite?.expiresAt || null,
      claimedAt: invite?.claimedAt || null,
      revokedAt: invite?.revokedAt || null,
      inviteUrl: plainToken ? this.buildFrontendUrl('/mitra/claim', { token: plainToken }) : null,
    };
  }

  private async syncMitraCapacityUsage(mitraUserId: string) {
    const mitra = await this.prisma.user.findUnique({
      where: { id: mitraUserId },
      include: { mitraProfile: true },
    });
    if (!mitra?.mitraProfile) {
      return {
        capacityLimit: DEFAULT_MITRA_CAPACITY_LIMIT,
        capacityUsed: 0,
        capacityRemaining: DEFAULT_MITRA_CAPACITY_LIMIT,
        isCapacityFull: false,
      };
    }

    const inviteCode = mitra.mitraProfile.inviteCode || mitra.myReferralCode || null;
    const capacityUsed = await this.prisma.user.count({
      where: this.managedYayasanWhere(mitraUserId, inviteCode),
    });
    if (Number(mitra.mitraProfile.capacityUsed || 0) !== capacityUsed) {
      await this.prisma.mitraProfile.update({
        where: { userId: mitraUserId },
        data: {
          capacityUsed,
          capacityUpdatedAt: new Date(),
        },
      });
    }
    const capacityLimit = Number(mitra.mitraProfile.capacityLimit || DEFAULT_MITRA_CAPACITY_LIMIT);
    return {
      capacityLimit,
      capacityUsed,
      capacityRemaining: Math.max(capacityLimit - capacityUsed, 0),
      isCapacityFull: capacityUsed >= capacityLimit,
    };
  }

  private async ensureMitraCanReceiveYayasanByCode(code?: string | null) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException('Referral code not found');
    }
    const mitra = await this.prisma.user.findFirst({
      where: {
        role: Role.MITRA,
        OR: [
          { myReferralCode: normalizedCode },
          { mitraProfile: { is: { inviteCode: normalizedCode } } },
        ],
      },
      include: { mitraProfile: true },
    });
    if (!mitra?.mitraProfile || mitra.status !== AccountStatus.ACTIVE || !(mitra.mitraProfile.isActive ?? true)) {
      throw new BadRequestException('Referral owner is not active');
    }
    const capacity = await this.syncMitraCapacityUsage(mitra.id);
    if (capacity.isCapacityFull) {
      throw new BadRequestException(
        `Kapasitas yayasan untuk mitra ini sudah penuh (${capacity.capacityUsed}/${capacity.capacityLimit}). Hubungi admin NEWME untuk penambahan kapasitas.`,
      );
    }
    return { mitra, capacity };
  }

  private async createInviteToken(userId: string, mitraProfileId: string) {
    await this.prisma.mitraInvite.updateMany({
      where: { userId, status: MitraInviteStatus.PENDING },
      data: {
        status: MitraInviteStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    const plainToken = randomBytes(24).toString('hex');
    const invite = await this.prisma.mitraInvite.create({
      data: {
        userId,
        mitraProfileId,
        tokenHash: this.hash(plainToken),
        status: MitraInviteStatus.PENDING,
        expiresAt: new Date(Date.now() + MITRA_INVITE_TTL_MS),
        sentAt: new Date(),
      },
    });
    return this.buildInviteView(invite, plainToken);
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
    const reserved = disbursements
      .filter((d) => d.status === 'PENDING' || d.status === 'PROCESSING')
      .reduce((acc, d) => acc + d.amount, 0);
    const out = disbursements.filter((d) => d.status === 'APPROVED').reduce((acc, d) => acc + d.amount, 0);
    return {
      balance: Math.max(revenue - out - reserved, 0),
      reserveBalance: reserved,
      transactions: disbursements.map((row) => mapDisbursementForClient(row)),
      totalRevenue: revenue,
      totalDisbursed: out,
      totalRequested: out + reserved,
    };
  }

  private buildMitraView(user: any, extra: Record<string, any> = {}) {
    return mapUserForClient(user, {
      inviteCode: extra.inviteCode ?? user?.mitraProfile?.inviteCode ?? user?.myReferralCode ?? null,
      isVerified: extra.isVerified ?? user?.mitraProfile?.isVerified ?? user?.status === 'ACTIVE',
      isActive: extra.isActive ?? user?.mitraProfile?.isActive ?? user?.status === 'ACTIVE',
      capacityLimit: extra.capacityLimit ?? user?.mitraProfile?.capacityLimit ?? DEFAULT_MITRA_CAPACITY_LIMIT,
      capacityUsed: extra.capacityUsed ?? user?.mitraProfile?.capacityUsed ?? 0,
      capacityRemaining:
        extra.capacityRemaining
        ?? Math.max(
          Number(extra.capacityLimit ?? user?.mitraProfile?.capacityLimit ?? DEFAULT_MITRA_CAPACITY_LIMIT)
            - Number(extra.capacityUsed ?? user?.mitraProfile?.capacityUsed ?? 0),
          0,
        ),
      isCapacityFull:
        extra.isCapacityFull
        ?? Number(extra.capacityUsed ?? user?.mitraProfile?.capacityUsed ?? 0)
          >= Number(extra.capacityLimit ?? user?.mitraProfile?.capacityLimit ?? DEFAULT_MITRA_CAPACITY_LIMIT),
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
      where: {
        id: yayasanId,
        ...this.managedYayasanWhere(mitraUserId, code),
      },
      include: { yayasanProfile: true, profile: true, wallet: true },
    });
    if (!yayasan) {
      throw new BadRequestException('Yayasan not managed by this mitra');
    }
    if (!yayasan.yayasanProfile?.managedByMitraId) {
      await this.prisma.yayasanProfile.update({
        where: { userId: yayasan.id },
        data: { managedByMitraId: mitraUserId },
      });
      if (yayasan.yayasanProfile) {
        yayasan.yayasanProfile.managedByMitraId = mitraUserId;
      }
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
    if (yayasan?.id && !yayasan?.yayasanProfile?.managedByMitraId) {
      await this.prisma.yayasanProfile.update({
        where: { userId: yayasan.id },
        data: { managedByMitraId: mitraUserId },
      });
      if (yayasan.yayasanProfile) {
        yayasan.yayasanProfile.managedByMitraId = mitraUserId;
      }
    }
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

  @Get('referral/:code/status')
  async referralStatus(@Param('code') code: string) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new NotFoundException('Referral mitra tidak ditemukan');
    }

    const mitra = await this.prisma.user.findFirst({
      where: {
        role: Role.MITRA,
        OR: [
          { myReferralCode: normalizedCode },
          { mitraProfile: { is: { inviteCode: normalizedCode } } },
        ],
      },
      include: { mitraProfile: true },
    });

    if (!mitra?.mitraProfile) {
      throw new NotFoundException('Referral mitra tidak ditemukan');
    }

    const capacity = await this.syncMitraCapacityUsage(mitra.id);
    return {
      mitraId: mitra.id,
      mitraName: mitra.fullName,
      inviteCode: mitra.mitraProfile.inviteCode || mitra.myReferralCode || normalizedCode,
      isActive: mitra.status === AccountStatus.ACTIVE && (mitra.mitraProfile.isActive ?? true),
      ...capacity,
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
    const capacity = await this.syncMitraCapacityUsage(user.sub);
    const latestInvite = await this.getLatestInvite(user.sub);
    return this.buildMitraView(me, {
      ...capacity,
      inviteStatus: latestInvite ? this.resolveInviteStatus(latestInvite) : null,
      inviteExpiresAt: latestInvite?.expiresAt || null,
      inviteClaimedAt: latestInvite?.claimedAt || null,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('dashboard/stats')
  async stats(@CurrentUser() user: any) {
    const code = await this.getManagedYayasanCode(user.sub);
    const yayasan = await this.prisma.user.findMany({
      where: this.managedYayasanWhere(user.sub, code),
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
      ...(await this.syncMitraCapacityUsage(user.sub)),
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
  async yayasanList(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const code = await this.getManagedYayasanCode(user.sub);
    const normalizedSearch = String(search || '').trim();
    const where: any = this.managedYayasanWhere(user.sub, code);
    if (normalizedSearch) {
      where.AND = [{
        OR: [
          { fullName: { contains: normalizedSearch } },
          { email: { contains: normalizedSearch } },
        ],
      }];
    }
    const { page: currentPage, pageSize: currentPageSize, skip, take } = resolvePagination({ page, pageSize }, { pageSize: 10, maxPageSize: 100 });
    const [total, list] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
      where,
      include: { yayasanProfile: true, profile: true, wallet: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    ]);

    const items = await Promise.all(list.map((item) => this.buildManagedYayasanView(user.sub, item)));
    return buildPaginatedResult(items, total, currentPage, currentPageSize);
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
  async priceChangeRequests(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const where: any = { mitraId: user.sub };
    if (normalizedStatus) where.status = normalizedStatus;
    const { page: currentPage, pageSize: currentPageSize, skip, take } = resolvePagination({ page, pageSize }, { pageSize: 10, maxPageSize: 100 });
    const rows = await this.prisma.yayasanPriceChangeRequest.findMany({
      where,
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

    const filtered = rows.map((row) =>
      this.mapPriceChangeRequest(row, {
        yayasanName: yayasanMap.get(row.yayasanId)?.fullName || 'Yayasan',
        yayasanEmail: yayasanMap.get(row.yayasanId)?.email || null,
      }),
    ).filter((row) => {
      if (!normalizedSearch) return true;
      return `${row.yayasanName || ''} ${row.yayasanEmail || ''} ${row.reason || ''}`.toLowerCase().includes(normalizedSearch);
    });

    return buildPaginatedResult(filtered.slice(skip, skip + take), filtered.length, currentPage, currentPageSize);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('wallet')
  async wallet(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const code = await this.getManagedYayasanCode(user.sub);
    const wallet = await this.computeMitraWallet(code, user.sub);
    const { page: currentPage, pageSize: currentPageSize } = resolvePagination({ page, pageSize }, { pageSize: 10, maxPageSize: 100 });
    const start = (currentPage - 1) * currentPageSize;
    return {
      ...wallet,
      transactions: buildPaginatedResult(wallet.transactions.slice(start, start + currentPageSize), wallet.transactions.length, currentPage, currentPageSize),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Post('wallet/withdraw')
  async withdrawWallet(@CurrentUser() user: any, @Body() body: WithdrawRequestDto) {
    const code = await this.getManagedYayasanCode(user.sub);
    const wallet = await this.computeMitraWallet(code, user.sub);
    if (body.amount > wallet.balance) throw new BadRequestException('Insufficient mitra wallet balance');

    return this.disbursementsService.createDisbursement({
      type: 'mitra',
      userId: user.sub,
      amount: Number(body.amount),
      notes: body.notes || null,
      bankName: body.bankName || null,
      bankAccount: body.bankAccount || null,
      accountName: body.accountName || null,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Post('withdraw')
  withdrawAlias(@CurrentUser() user: any, @Body() body: WithdrawRequestDto) {
    return this.withdrawWallet(user, body);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.manage')
  async adminCreateMitra(@Body() body: CreateMitraInviteDto) {
    const fullName = String(body.fullName || '').trim();
    const phone = this.normalizePhone(body.phone);
    if (!fullName || !phone) {
      throw new BadRequestException('Nama mitra dan nomor HP wajib diisi.');
    }

    const phoneUsed = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (phoneUsed) {
      throw new BadRequestException('Phone or WhatsApp already registered');
    }

    const inviteCode = await this.generateUniqueMitraBusinessCode();
    const normalizedEmail = body.email ? this.normalizeEmail(body.email) : null;
    if (normalizedEmail) {
      const emailUsed = await this.prisma.user.findFirst({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (emailUsed) {
        throw new BadRequestException('Email already registered');
      }
    }

    const mitra = await this.prisma.user.create({
      data: {
        email: normalizedEmail || this.buildPendingMitraEmail(inviteCode),
        fullName,
        phone,
        passwordHash: this.hash(randomBytes(16).toString('hex')),
        role: Role.MITRA,
        status: AccountStatus.PENDING_VERIFICATION,
        myReferralCode: inviteCode,
        wallet: { create: { availableBalance: 0, reserveBalance: 0 } },
        profile: {
          create: {
            extra: {
              address: null,
              description: null,
            },
          },
        },
        mitraProfile: {
          create: {
            inviteCode,
            isActive: true,
            isVerified: false,
            capacityLimit: DEFAULT_MITRA_CAPACITY_LIMIT,
            capacityUsed: 0,
            capacityUpdatedAt: new Date(),
          },
        },
      },
      include: { mitraProfile: true, profile: true, wallet: true },
    });

    const invite = await this.createInviteToken(mitra.id, mitra.mitraProfile!.id);
    return {
      mitra: this.buildMitraView(mitra, {
        capacityLimit: DEFAULT_MITRA_CAPACITY_LIMIT,
        capacityUsed: 0,
        capacityRemaining: DEFAULT_MITRA_CAPACITY_LIMIT,
        isCapacityFull: false,
        inviteStatus: invite.status,
        inviteExpiresAt: invite.expiresAt,
      }),
      invite,
    };
  }

  @Post('admin/:id/invite/resend')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.manage')
  async adminResendInvite(@Param('id') id: string) {
    const mitra = await this.prisma.user.findUnique({
      where: { id },
      include: { mitraProfile: true, profile: true, wallet: true },
    });
    if (!mitra?.mitraProfile) {
      throw new NotFoundException('Mitra not found');
    }
    const invite = await this.createInviteToken(mitra.id, mitra.mitraProfile.id);
    return {
      mitra: this.buildMitraView(mitra, {
        ...(await this.syncMitraCapacityUsage(mitra.id)),
        inviteStatus: invite.status,
        inviteExpiresAt: invite.expiresAt,
      }),
      invite,
    };
  }

  @Post('admin/:id/invite/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.manage')
  async adminRevokeInvite(@Param('id') id: string) {
    await this.prisma.mitraInvite.updateMany({
      where: { userId: id, status: MitraInviteStatus.PENDING },
      data: {
        status: MitraInviteStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    const latestInvite = await this.getLatestInvite(id);
    return {
      success: true,
      invite: latestInvite ? this.buildInviteView(latestInvite) : null,
    };
  }

  @Put('admin/:id/capacity')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.manage')
  async adminUpdateCapacity(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateMitraCapacityDto) {
    const mitra = await this.prisma.user.findUnique({
      where: { id },
      include: { mitraProfile: true, profile: true, wallet: true },
    });
    if (!mitra?.mitraProfile) {
      throw new NotFoundException('Mitra not found');
    }

    const currentCapacity = await this.syncMitraCapacityUsage(id);
    if (Number(body.capacityLimit || 0) < currentCapacity.capacityUsed) {
      throw new BadRequestException(`Kapasitas baru tidak boleh lebih kecil dari penggunaan saat ini (${currentCapacity.capacityUsed}).`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mitraProfile.update({
        where: { userId: id },
        data: {
          capacityLimit: Number(body.capacityLimit),
          capacityUsed: currentCapacity.capacityUsed,
          capacityUpdatedAt: new Date(),
        },
      });
      await tx.mitraCapacityChangeLog.create({
        data: {
          mitraProfileId: mitra.mitraProfile!.id,
          mitraUserId: id,
          changedByAdminId: user.sub,
          previousLimit: Number(mitra.mitraProfile!.capacityLimit || DEFAULT_MITRA_CAPACITY_LIMIT),
          newLimit: Number(body.capacityLimit),
          note: body.note || null,
        },
      });
    });

    const updated = await this.prisma.user.findUnique({
      where: { id },
      include: { mitraProfile: true, profile: true, wallet: true },
    });
    return this.buildMitraView(updated, await this.syncMitraCapacityUsage(id));
  }

  @Get('admin/:id/capacity-history')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.view')
  async adminCapacityHistory(@Param('id') id: string) {
    const rows = await this.prisma.mitraCapacityChangeLog.findMany({
      where: { mitraUserId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        changedByAdmin: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      previousLimit: row.previousLimit,
      newLimit: row.newLimit,
      note: row.note,
      createdAt: row.createdAt,
      changedByAdminName: row.changedByAdmin?.fullName || null,
      changedByAdminEmail: row.changedByAdmin?.email || null,
    }));
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.view')
  async adminList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const normalizedSearch = String(search || '').trim();
    const where: any = { role: Role.MITRA };
    if (normalizedSearch) {
      where.OR = [
        { fullName: { contains: normalizedSearch } },
        { email: { contains: normalizedSearch } },
        { myReferralCode: { contains: normalizedSearch } },
      ];
    }
    const { page: currentPage, pageSize: currentPageSize, skip, take } = resolvePagination({ page, pageSize }, { pageSize: 10, maxPageSize: 100 });
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { mitraProfile: true, profile: true, wallet: true },
      skip,
      take,
    }),
    ]);

    const items = await Promise.all(rows.map(async (row) => {
      const code = row.mitraProfile?.inviteCode || row.myReferralCode || '';
      const yayasanCount = await this.prisma.user.count({ where: this.managedYayasanWhere(row.id, code) });
      const capacity = await this.syncMitraCapacityUsage(row.id);
      const latestInvite = await this.getLatestInvite(row.id);
      return this.buildMitraView(row, {
        yayasanCount,
        ...capacity,
        inviteStatus: latestInvite ? this.resolveInviteStatus(latestInvite) : null,
        inviteExpiresAt: latestInvite?.expiresAt || null,
        inviteClaimedAt: latestInvite?.claimedAt || null,
      });
    }));

    return buildPaginatedResult(items, total, currentPage, currentPageSize);
  }

  @Get('admin/:id/detail')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.view')
  async adminDetail(@Param('id') id: string) {
    const mitra = await this.prisma.user.findUnique({
      where: { id },
      include: { mitraProfile: true, profile: true, wallet: true },
    });
    if (!mitra) {
      throw new NotFoundException('Mitra not found');
    }
    const code = mitra?.mitraProfile?.inviteCode || mitra?.myReferralCode || '';
    const yayasanRows = code
      ? await this.prisma.user.findMany({
          where: this.managedYayasanWhere(id, code),
          include: { yayasanProfile: true, profile: true, wallet: true },
        })
      : [];
    const yayasanDetails = await Promise.all(yayasanRows.map((yayasan) => this.buildManagedYayasanView(id, yayasan)));
    const capacity = await this.syncMitraCapacityUsage(id);
    const latestInvite = await this.getLatestInvite(id);
    const capacityChangeLogs = await this.prisma.mitraCapacityChangeLog.findMany({
      where: { mitraUserId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        changedByAdmin: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return this.buildMitraView(mitra, {
      totalYayasan: yayasanDetails.length,
      totalUsers: yayasanDetails.reduce((sum, item: any) => sum + (item.usersCount || 0), 0),
      totalRevenue: yayasanDetails.reduce((sum, item: any) => sum + (item.totalCommission || 0), 0),
      yayasanDetails,
      ...capacity,
      inviteStatus: latestInvite ? this.resolveInviteStatus(latestInvite) : null,
      inviteExpiresAt: latestInvite?.expiresAt || null,
      inviteClaimedAt: latestInvite?.claimedAt || null,
      capacityHistory: capacityChangeLogs.map((row) => ({
        id: row.id,
        previousLimit: row.previousLimit,
        newLimit: row.newLimit,
        note: row.note,
        createdAt: row.createdAt,
        changedByAdminName: row.changedByAdmin?.fullName || null,
        changedByAdminEmail: row.changedByAdmin?.email || null,
      })),
    });
  }

  @Get('admin/price-change-requests')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('price_change_requests.view')
  async adminPriceChangeRequests(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const where: any = normalizedStatus ? { status: normalizedStatus } : {};
    const { page: currentPage, pageSize: currentPageSize, skip, take } = resolvePagination({ page, pageSize }, { pageSize: 10, maxPageSize: 100 });
    const rows = await this.prisma.yayasanPriceChangeRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
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

    const filtered = rows.map((row) =>
      this.mapPriceChangeRequest(row, {
        mitraName: mitraMap.get(row.mitraId)?.fullName || 'Mitra',
        mitraEmail: mitraMap.get(row.mitraId)?.email || null,
        yayasanName: yayasanMap.get(row.yayasanId)?.fullName || 'Yayasan',
        yayasanEmail: yayasanMap.get(row.yayasanId)?.email || null,
      }),
    ).filter((row) => {
      if (!normalizedSearch) return true;
      return `${row.mitraName || ''} ${row.mitraEmail || ''} ${row.yayasanName || ''} ${row.yayasanEmail || ''} ${row.reason || ''}`.toLowerCase().includes(normalizedSearch);
    });

    return buildPaginatedResult(filtered.slice(skip, skip + take), filtered.length, currentPage, currentPageSize);
  }

  @Put('admin/price-change-requests/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('price_change_requests.manage')
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
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.manage')
  async toggleActive(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, include: { mitraProfile: true, profile: true, wallet: true } });
    const nextActive = !(row?.mitraProfile?.isActive ?? row?.status === 'ACTIVE');
    await this.prisma.mitraProfile.upsert({
      where: { userId: id },
      create: {
        userId: id,
        inviteCode: row?.myReferralCode || row?.mitraProfile?.inviteCode || 'M00000',
        isActive: nextActive,
        capacityLimit: row?.mitraProfile?.capacityLimit || DEFAULT_MITRA_CAPACITY_LIMIT,
        capacityUsed: row?.mitraProfile?.capacityUsed || 0,
        capacityUpdatedAt: row?.mitraProfile?.capacityUpdatedAt || new Date(),
      },
      update: { isActive: nextActive },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: { status: nextActive ? 'ACTIVE' : 'INACTIVE' }, include: { mitraProfile: true, profile: true, wallet: true } });
    return this.buildMitraView(updated);
  }

  @Put('admin/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.manage')
  async verify(@Param('id') id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, include: { mitraProfile: true, profile: true, wallet: true } });
    await this.prisma.mitraProfile.upsert({
      where: { userId: id },
      create: {
        userId: id,
        inviteCode: row?.myReferralCode || row?.mitraProfile?.inviteCode || 'M00000',
        isVerified: true,
        isActive: true,
        capacityLimit: row?.mitraProfile?.capacityLimit || DEFAULT_MITRA_CAPACITY_LIMIT,
        capacityUsed: row?.mitraProfile?.capacityUsed || 0,
        capacityUpdatedAt: row?.mitraProfile?.capacityUpdatedAt || new Date(),
      },
      update: { isVerified: true, isActive: true },
    });
    const updated = await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' }, include: { mitraProfile: true, profile: true, wallet: true } });
    return this.buildMitraView(updated);
  }

  @Post('admin/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra.manage')
  async resetPassword(@Param('id') id: string) {
    const nextPassword = `Reset-${randomBytes(4).toString('hex')}`;
    await this.prisma.user.update({ where: { id }, data: { passwordHash: this.hash(nextPassword) } });
    return { message: 'Password reset success. Temporary password generated and stored securely.' };
  }

  @Get('admin/withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra_withdrawals.view')
  async withdrawals(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const where: any = { type: 'mitra' };
    if (normalizedStatus) where.status = normalizedStatus;
    const { page: currentPage, pageSize: currentPageSize, skip, take } = resolvePagination({ page, pageSize }, { pageSize: 10, maxPageSize: 100 });
    const rows = await this.prisma.disbursement.findMany({ where, orderBy: { createdAt: 'desc' } });
    const users = rows.length
      ? await this.prisma.user.findMany({
          where: { id: { in: rows.map((row) => row.userId).filter(Boolean) as string[] } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item]));

    const filtered = rows.map((row) => mapDisbursementForClient(row, {
      mitraName: row.userId ? userMap.get(row.userId)?.fullName || 'Mitra' : 'Mitra',
      mitraEmail: row.userId ? userMap.get(row.userId)?.email || null : null,
    })).filter((row: any) => {
      if (!normalizedSearch) return true;
      return `${row.mitraName || ''} ${row.mitraEmail || ''} ${row.bankName || ''} ${row.bankAccount || ''}`.toLowerCase().includes(normalizedSearch);
    });

    return buildPaginatedResult(filtered.slice(skip, skip + take), filtered.length, currentPage, currentPageSize);
  }

  @Put('admin/withdrawals/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra_withdrawals.manage')
  async approveWithdrawal(@Param('id') id: string, @Body() body: ProcessWithdrawalDto) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Withdrawal request id is required.');
    }
    return this.disbursementsService.processDisbursement(id, body, { type: 'mitra' });
  }

  @Put('admin/withdrawals/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('mitra_withdrawals.manage')
  rejectWithdrawal(@Param('id') id: string, @Body() body: ProcessWithdrawalDto) {
    return this.approveWithdrawal(id, { ...body, status: 'REJECTED' });
  }
}
