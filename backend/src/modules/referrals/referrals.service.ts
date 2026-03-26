import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DisbursementStatus, Role } from '@prisma/client';
import { mapDisbursementForClient } from 'src/common/mappers/client-shapes';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { DisbursementsService } from '../disbursements/disbursements.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferralWithdrawalDto } from './dto/create-referral-withdrawal.dto';
import { ProcessReferralWithdrawalDto } from './dto/process-referral-withdrawal.dto';
import { ReferralTransactionsQueryDto } from './dto/referral-transactions-query.dto';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';

type ReferralProgramSettings = {
  isActive: boolean;
  bonusPerReferral: number;
  minimumWithdraw: number;
  title: string;
  description: string;
  benefits: string[];
  termsAndConditions: string;
};

@Injectable()
export class ReferralsService {
  private readonly settingsKey = 'userReferralProgramSettings';
  private readonly defaultSettings: ReferralProgramSettings = {
    isActive: true,
    bonusPerReferral: 10000,
    minimumWithdraw: 50000,
    title: 'Program Referral NEWME',
    description: 'Ajak teman bergabung ke NEWME dan dapatkan bonus Rp10.000 setiap transaksi premium mereka yang berhasil.',
    benefits: [
      'Bonus referral masuk ke wallet referral user.',
      'Saldo referral dapat diajukan withdraw melalui DANA.',
      'Bonus hanya dihitung untuk pembayaran premium yang sukses.',
    ],
    termsAndConditions:
      'Bonus referral diberikan satu kali untuk setiap user baru yang memakai kode referral user dan berhasil menyelesaikan pembayaran premium. Withdraw diproses manual oleh admin sebelum payout dikirim.',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly disbursementsService: DisbursementsService,
  ) {}

  private normalizeSettings(value: unknown): ReferralProgramSettings {
    const raw = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};

    return {
      isActive: raw.isActive ?? this.defaultSettings.isActive,
      bonusPerReferral: Math.max(Number(raw.bonusPerReferral ?? this.defaultSettings.bonusPerReferral) || 0, 0),
      minimumWithdraw: Math.max(Number(raw.minimumWithdraw ?? this.defaultSettings.minimumWithdraw) || 0, 0),
      title: String(raw.title || this.defaultSettings.title).trim(),
      description: String(raw.description || this.defaultSettings.description).trim(),
      benefits: Array.isArray(raw.benefits)
        ? raw.benefits.map((item) => String(item || '').trim()).filter(Boolean)
        : this.defaultSettings.benefits,
      termsAndConditions: String(raw.termsAndConditions || this.defaultSettings.termsAndConditions).trim(),
    };
  }

  private async readSettings() {
    const row = await this.prisma.setting.findUnique({ where: { key: this.settingsKey } });
    return this.normalizeSettings(row?.value);
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });
    if (!user || user.role !== Role.USER) {
      throw new NotFoundException('User referral account not found');
    }
    return user;
  }

  private buildWithdrawalShape(row: any, userMap: Map<string, any> = new Map()) {
    const user = row?.userId ? userMap.get(row.userId) : null;
    return mapDisbursementForClient(row, {
      type: 'user_referral',
      userName: user?.fullName || null,
      userEmail: user?.email || null,
      danaNumber: row?.bankAccount || null,
      payoutChannel: row?.bankName || 'DANA',
    });
  }

  private buildWalletLedgerItems(referralTransactions: any[], withdrawals: any[]) {
    const credits = referralTransactions.map((item) => ({
      id: `bonus-${item.id}`,
      kind: 'bonus',
      status: 'earned',
      amount: Number(item.commission || 0),
      createdAt: item.createdAt,
      sourceOrderId: item.sourceOrderId || null,
      description: 'Bonus referral premium berhasil',
      referenceId: item.id,
    }));

    const debits = withdrawals.map((item) => ({
      id: `withdraw-${item.id}`,
      kind: 'withdrawal',
      status: String(item.status || '').toLowerCase(),
      amount: -Number(item.amount || 0),
      createdAt: item.createdAt,
      sourceOrderId: null,
      description: `Withdraw ${String(item.bankName || 'DANA').toUpperCase()}`,
      referenceId: item.id,
      providerStatus: item.providerStatus || null,
      failureReason: item.failureReason || null,
    }));

    return [...credits, ...debits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getSettings() {
    return this.readSettings();
  }

  async updateSettings(dto: UpdateReferralSettingsDto) {
    const current = await this.readSettings();
    const next = this.normalizeSettings({
      ...current,
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.bonusPerReferral !== undefined ? { bonusPerReferral: dto.bonusPerReferral } : {}),
      ...(dto.minimumWithdraw !== undefined ? { minimumWithdraw: dto.minimumWithdraw } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
      ...(dto.termsAndConditions !== undefined ? { termsAndConditions: dto.termsAndConditions } : {}),
    });

    await this.prisma.setting.upsert({
      where: { key: this.settingsKey },
      create: { key: this.settingsKey, value: next },
      update: { value: next },
    });

    return next;
  }

  async getUserWallet(userId: string) {
    const [settings, user, referralTransactions, withdrawals] = await Promise.all([
      this.readSettings(),
      this.getUserOrThrow(userId),
      this.prisma.referralTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.disbursement.findMany({
        where: { type: 'user_referral', userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalBonus = referralTransactions.reduce((sum, item) => sum + Number(item.commission || 0), 0);
    const reserveBalance = withdrawals
      .filter((item) => item.status === DisbursementStatus.PENDING || item.status === DisbursementStatus.PROCESSING)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paidWithdraw = withdrawals
      .filter((item) => item.status === DisbursementStatus.APPROVED)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const availableBalance = Math.max(totalBonus - reserveBalance - paidWithdraw, 0);
    const walletItems = this.buildWalletLedgerItems(referralTransactions, withdrawals);

    return {
      userId: user.id,
      referralCode: user.myReferralCode || null,
      referralCount: await this.prisma.user.count({ where: { referredByCode: user.myReferralCode || '' } }),
      totalBonus,
      availableBalance,
      reserveBalance,
      paidWithdraw,
      pendingWithdraw: reserveBalance,
      minimumWithdraw: settings.minimumWithdraw,
      isActive: settings.isActive,
      walletItems,
      withdrawals: withdrawals.map((item) => this.buildWithdrawalShape(item)),
    };
  }

  async requestWithdraw(userId: string, dto: CreateReferralWithdrawalDto) {
    const settings = await this.readSettings();
    if (!settings.isActive) {
      throw new BadRequestException('Program referral user sedang nonaktif.');
    }

    const wallet = await this.getUserWallet(userId);
    const amount = Math.max(Number(dto.amount || 0), 0);
    if (!amount) {
      throw new BadRequestException('Nominal withdraw belum valid.');
    }
    if (amount < settings.minimumWithdraw) {
      throw new BadRequestException(`Minimum withdraw adalah Rp ${settings.minimumWithdraw.toLocaleString('id-ID')}.`);
    }
    if (amount > wallet.availableBalance) {
      throw new BadRequestException('Saldo wallet referral tidak mencukupi.');
    }

    return this.disbursementsService.createDisbursement({
      type: 'user_referral',
      userId,
      amount,
      notes: dto.notes || 'Withdraw referral user via DANA',
      bankName: 'DANA',
      bankAccount: String(dto.danaNumber || '').trim(),
      accountName: String(dto.accountName || '').trim(),
    });
  }

  async getUserWithdrawals(userId: string) {
    const rows = await this.prisma.disbursement.findMany({
      where: { type: 'user_referral', userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((item) => this.buildWithdrawalShape(item));
  }

  async getBonusPerReferral() {
    const settings = await this.readSettings();
    return settings.bonusPerReferral;
  }

  async leaderboard(limit: number) {
    const userRows = await this.prisma.user.findMany({
      where: { role: Role.USER, myReferralCode: { not: null } },
      select: {
        id: true,
        fullName: true,
        email: true,
        myReferralCode: true,
      },
    });

    const referralCodes = userRows.map((item) => item.myReferralCode).filter(Boolean) as string[];
    const [referralCounts, commissionRows, withdrawals] = await Promise.all([
      referralCodes.length
        ? this.prisma.user.groupBy({
            by: ['referredByCode'],
            where: { role: Role.USER, referredByCode: { in: referralCodes } },
            _count: { _all: true },
          })
        : [],
      this.prisma.referralTransaction.groupBy({
        by: ['userId'],
        _sum: { commission: true },
        _count: { _all: true },
      }),
      this.prisma.disbursement.findMany({
        where: { type: 'user_referral', status: DisbursementStatus.APPROVED },
        select: { userId: true, amount: true },
      }),
    ]);

    const referralCountMap = new Map<string, number>(
      referralCounts.map((item) => [String(item.referredByCode || ''), Number(item._count._all || 0)] as [string, number]),
    );
    const commissionMap = new Map(commissionRows.map((item) => [item.userId, Number(item._sum.commission || 0)]));
    const paidWithdrawMap = new Map<string, number>();
    for (const row of withdrawals) {
      if (!row.userId) continue;
      paidWithdrawMap.set(row.userId, (paidWithdrawMap.get(row.userId) || 0) + Number(row.amount || 0));
    }

    return userRows
      .map((item) => ({
        userId: item.id,
        fullName: item.fullName || 'User',
        email: item.email || null,
        referralCode: item.myReferralCode,
        referralCount: referralCountMap.get(item.myReferralCode || '') || 0,
        totalCommission: commissionMap.get(item.id) || 0,
        totalPaidWithdraw: paidWithdrawMap.get(item.id) || 0,
      }))
      .filter((item) => Number(item.referralCount || 0) > 0 || Number(item.totalCommission || 0) > 0)
      .sort((a, b) => {
        const bCount = Number(b.referralCount || 0);
        const aCount = Number(a.referralCount || 0);
        if (bCount !== aCount) return bCount - aCount;
        return Number(b.totalCommission || 0) - Number(a.totalCommission || 0);
      })
      .slice(0, Math.max(Number(limit || 10), 1));
  }

  async transactions(query: ReferralTransactionsQueryDto) {
    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const rows = await this.prisma.referralTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const userIds = [...new Set(rows.map((item) => item.userId).filter(Boolean))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds }, role: Role.USER },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item]));

    return {
      transactions: rows.map((item) => ({
        ...item,
        userName: userMap.get(item.userId)?.fullName || 'User',
        userEmail: userMap.get(item.userId)?.email || null,
      })),
      total: rows.length,
    };
  }

  async stats() {
    const userReferrers = await this.prisma.user.findMany({
      where: { role: Role.USER, myReferralCode: { not: null } },
      select: { id: true, myReferralCode: true },
    });
    const referralCodes = userReferrers.map((item) => item.myReferralCode).filter(Boolean) as string[];

    const [referralCounts, referralBonus, withdrawals] = await Promise.all([
      referralCodes.length
        ? this.prisma.user.groupBy({
            by: ['referredByCode'],
            where: { role: Role.USER, referredByCode: { in: referralCodes } },
            _count: { _all: true },
          })
        : [],
      this.prisma.referralTransaction.aggregate({
        where: { userId: { in: userReferrers.map((item) => item.id) } },
        _sum: { commission: true },
      }),
      this.prisma.disbursement.findMany({
        where: { type: 'user_referral' },
        select: { status: true, amount: true },
      }),
    ]);

    const totalBonusGenerated = Number(referralBonus._sum.commission || 0);
    const totalBonusPaid = withdrawals
      .filter((item) => item.status === DisbursementStatus.APPROVED)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingWithdraw = withdrawals
      .filter((item) => item.status === DisbursementStatus.PENDING || item.status === DisbursementStatus.PROCESSING)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalWalletBalance = Math.max(totalBonusGenerated - totalBonusPaid - pendingWithdraw, 0);
    const totalReferrals = referralCounts.reduce((sum, item) => sum + Number(item._count?._all || 0), 0);

    return {
      totalReferrers: referralCounts.length,
      totalReferrals,
      totalBonusGenerated,
      totalWalletBalance,
      pendingWithdraw,
      totalBonusPaid,
      pendingBonus: totalWalletBalance + pendingWithdraw,
    };
  }

  async listWithdrawals(query: {
    page?: string;
    pageSize?: string;
    status?: string;
    search?: string;
  }) {
    const pagination = resolvePagination(query, { pageSize: 10, maxPageSize: 100 });
    const normalizedStatus = String(query.status || '').trim().toUpperCase();
    const normalizedSearch = String(query.search || '').trim().toLowerCase();
    const rows = await this.prisma.disbursement.findMany({
      where: {
        type: 'user_referral',
        ...(normalizedStatus ? { status: normalizedStatus as DisbursementStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    const userIds = [...new Set(rows.map((item) => item.userId).filter(Boolean))] as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id, item]));
    const filtered = rows
      .map((item) => this.buildWithdrawalShape(item, userMap))
      .filter((item: any) => {
        if (!normalizedSearch) return true;
        return `${item.userName || ''} ${item.userEmail || ''} ${item.danaNumber || ''}`
          .toLowerCase()
          .includes(normalizedSearch);
      });

    return buildPaginatedResult(
      filtered.slice(pagination.skip, pagination.skip + pagination.take),
      filtered.length,
      pagination.page,
      pagination.pageSize,
    );
  }

  async approveWithdrawal(id: string, dto: ProcessReferralWithdrawalDto) {
    return this.disbursementsService.processDisbursement(id, dto, { type: 'user_referral' });
  }

  async rejectWithdrawal(id: string, dto: ProcessReferralWithdrawalDto) {
    return this.disbursementsService.processDisbursement(id, { ...dto, status: 'REJECTED' }, { type: 'user_referral' });
  }
}
