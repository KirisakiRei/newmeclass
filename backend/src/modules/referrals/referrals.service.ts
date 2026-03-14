import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { ReferralTransactionsQueryDto } from './dto/referral-transactions-query.dto';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getContentSetting() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'userReferralContent' } });
    return (row?.value as Record<string, any>) || {};
  }

  private getDefaultContent() {
    return {
      title: 'Program Referral NEWME',
      description: 'Ajak teman bergabung dan dapatkan bonus setelah mereka menyelesaikan pembayaran premium.',
      benefits: [
        'Dapat bonus Rp 10.000 untuk setiap referral yang berhasil membayar.',
        'Jumlah referral bertambah otomatis saat akun referral selesai dibuat.',
        'Link referral pribadi dapat dibagikan langsung ke calon pengguna baru.',
      ],
      termsAndConditions:
        'Bonus referral diberikan satu kali untuk setiap pengguna baru yang mendaftar menggunakan link Anda dan menyelesaikan pembayaran premium. Bonus tidak berlaku ganda untuk pembayaran yang sama.',
    };
  }

  async getSettings() {
    const row = await this.prisma.referralSetting.findFirst();
    const content = await this.getContentSetting();
    const baseRow =
      row ||
      (await this.prisma.referralSetting.create({
        data: { baseCommissionPercent: 10, maxCommissionPercent: 35 },
      }));
    return {
      ...baseRow,
      ...this.getDefaultContent(),
      ...content,
    };
  }

  async updateSettings(dto: UpdateReferralSettingsDto) {
    const { title, description, benefits, termsAndConditions, ...numeric } = dto;
    const current = await this.prisma.referralSetting.findFirst();
    const settingsRow = !current
      ? await this.prisma.referralSetting.create({
          data: {
            baseCommissionPercent: numeric.baseCommissionPercent ?? 10,
            maxCommissionPercent: numeric.maxCommissionPercent ?? 35,
          },
        })
      : await this.prisma.referralSetting.update({
          where: { id: current.id },
          data: {
            ...(typeof numeric.baseCommissionPercent === 'number'
              ? { baseCommissionPercent: numeric.baseCommissionPercent }
              : {}),
            ...(typeof numeric.maxCommissionPercent === 'number'
              ? { maxCommissionPercent: numeric.maxCommissionPercent }
              : {}),
          },
        });

    await this.prisma.setting.upsert({
      where: { key: 'userReferralContent' },
      create: {
        key: 'userReferralContent',
        value: {
          ...this.getDefaultContent(),
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
          ...(benefits ? { benefits } : {}),
          ...(termsAndConditions ? { termsAndConditions } : {}),
        },
      },
      update: {
        value: {
          ...this.getDefaultContent(),
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
          ...(benefits ? { benefits } : {}),
          ...(termsAndConditions ? { termsAndConditions } : {}),
        },
      },
    });

    return {
      ...settingsRow,
      ...this.getDefaultContent(),
      ...(await this.getContentSetting()),
    };
  }

  async leaderboard(limit: number) {
    const grouped = await this.prisma.referralTransaction.groupBy({
      by: ['userId'],
      _sum: { commission: true },
      _count: { _all: true },
      orderBy: { _sum: { commission: 'desc' } },
      take: limit,
    });

    const users = await this.prisma.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, fullName: true, email: true } });

    return grouped.map((g, idx) => {
      const user = users.find((u) => u.id === g.userId);
      return {
        rank: idx + 1,
        userId: g.userId,
        name: user?.fullName || 'Unknown',
        email: user?.email || null,
        totalCommission: g._sum.commission || 0,
        totalTransactions: g._count._all,
      };
    });
  }

  async transactions(query: ReferralTransactionsQueryDto) {
    const where = query.userId ? { userId: query.userId } : {};
    const rows = await this.prisma.referralTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    return { transactions: rows, total: rows.length };
  }

  async stats() {
    const [txCount, sumCommission, activeReferrers] = await Promise.all([
      this.prisma.referralTransaction.count(),
      this.prisma.referralTransaction.aggregate({ _sum: { commission: true } }),
      this.prisma.referralTransaction.groupBy({ by: ['userId'] }),
    ]);

    return {
      totalReferrals: txCount,
      totalCommission: sumCommission._sum.commission || 0,
      activeReferrers: activeReferrers.length,
    };
  }
}
