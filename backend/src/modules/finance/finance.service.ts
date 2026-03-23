import { BadRequestException, Injectable } from '@nestjs/common';
import { DisbursementStatus, PaymentStatus, PaymentType, Role } from '@prisma/client';
import { encodeWithdrawalNotes, mapDisbursementForClient, parseWithdrawalNotes, toClientPaymentStatus } from 'src/common/mappers/client-shapes';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { resolveCanonicalDevFeePercent, resolveCanonicalPaymentAmount } from 'src/common/settings/finance-settings';
import { DisbursementsService } from '../disbursements/disbursements.service';
import { PrismaService } from '../prisma/prisma.service';

type PeriodKey = 'this_month' | '3_months' | 'this_year' | 'all_time';

type RevenueRow = {
  id: string;
  amount: number;
  jalur: 'individu' | 'yayasan';
  status: 'approved';
  date: string;
  user: string;
  email: string | null;
  method: string;
  split: {
    grossAmount: number;
    newmeGross: number;
    newmeNet: number;
    devFee: number;
    mitraShare: number;
    yayasanShare: number;
    isEstimated: boolean;
  };
};

const APPROVED_ORDER_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.SUCCESS,
  PaymentStatus.SETTLEMENT,
  PaymentStatus.CAPTURE,
]);

const RESERVED_DISBURSEMENT_STATUSES = new Set<DisbursementStatus>([
  DisbursementStatus.PENDING,
  DisbursementStatus.PROCESSING,
  DisbursementStatus.APPROVED,
]);

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disbursementsService: DisbursementsService,
  ) {}

  private getPeriodStart(period?: string) {
    const now = new Date();
    const normalized = String(period || 'all_time').toLowerCase() as PeriodKey;
    if (normalized === 'this_month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (normalized === '3_months') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (normalized === 'this_year') return new Date(now.getFullYear(), 0, 1);
    return null;
  }

  private async getFinanceSettings() {
    const rows = await this.prisma.setting.findMany({
      where: {
        key: {
          in: [
            'paymentAmount',
            'testPrice',
            'devFeePercent',
            'devBankName',
            'devBankAccount',
            'devAccountName',
            'general',
          ],
        },
      },
    });
    const settings = new Map(rows.map((row) => [row.key, row.value]));
    const general = (settings.get('general') as Record<string, any>) || {};
    const devFeePercent = resolveCanonicalDevFeePercent({
      devFeePercent: settings.get('devFeePercent') ?? general.devFeePercent,
    });

    return {
      testPrice: resolveCanonicalPaymentAmount({
        paymentAmount: settings.get('paymentAmount') ?? general.paymentAmount,
        testPrice: settings.get('testPrice') ?? general.testPrice,
      }),
      devFeePercent,
      devBankName: String(settings.get('devBankName') ?? general.devBankName ?? '').trim(),
      devBankAccount: String(settings.get('devBankAccount') ?? general.devBankAccount ?? '').trim(),
      devAccountName: String(settings.get('devAccountName') ?? general.devAccountName ?? '').trim(),
    };
  }

  private getOrderMethod(order: any) {
    const source = String(order?.metadata?.source || '').toLowerCase();
    if (source.includes('wallet')) return 'wallet';
    if (source.includes('manual')) return 'manual';
    if (source.includes('snap') || order?.paymentUrl) return 'midtrans';
    return 'system';
  }

  private getJalurFromPricing(pricing: any, ledger?: any): 'individu' | 'yayasan' {
    if (pricing?.yayasanReferralCode || Number(pricing?.yayasanShare || 0) > 0 || Number(ledger?.yayasanShare || 0) > 0) {
      return 'yayasan';
    }
    return 'individu';
  }

  private computeSplitFromPricing(amount: number, pricing: any, devFeePercent: number, ledger?: any) {
    const yayasanShare = Math.max(Number(ledger?.yayasanShare ?? pricing?.yayasanShare ?? 0) || 0, 0);
    const mitraShare = Math.max(Number(ledger?.mitraShare ?? pricing?.mitraShare ?? 0) || 0, 0);
    const newmeGross = Math.max(Number(ledger?.newmeShare ?? (amount - yayasanShare - mitraShare)) || 0, 0);
    const devFee = Math.max(Number(ledger?.developerFee ?? 0) || Math.round(newmeGross * (devFeePercent / 100)), 0);
    const newmeNet = Math.max(newmeGross - devFee, 0);

    return {
      grossAmount: amount,
      newmeGross,
      newmeNet,
      devFee,
      mitraShare,
      yayasanShare,
      isEstimated: !ledger,
    };
  }

  private async getDeveloperWallet(period?: string) {
    const settings = await this.getFinanceSettings();
    const periodStart = this.getPeriodStart(period);
    const revenueRows = await this.prisma.revenueLedger.findMany({
      where: periodStart ? { createdAt: { gte: periodStart } } : undefined,
    });
    const totalDevFee = revenueRows.reduce((sum, row) => {
      const newmeGross = Math.max(Number(row.newmeShare || 0), 0);
      const amount = row.developerFee > 0 ? Number(row.developerFee) : Math.round(newmeGross * (settings.devFeePercent / 100));
      return sum + Math.max(amount, 0);
    }, 0);

    const disbursements = await this.prisma.disbursement.findMany({
      where: {
        type: 'developer',
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      },
    });
    const reserved = disbursements
      .filter((row) => row.status === DisbursementStatus.PENDING || row.status === DisbursementStatus.PROCESSING)
      .reduce((sum, row) => sum + row.amount, 0);
    const committed = disbursements
      .filter((row) => RESERVED_DISBURSEMENT_STATUSES.has(row.status))
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      totalDevFee,
      reserved,
      approved: disbursements
        .filter((row) => row.status === DisbursementStatus.APPROVED)
        .reduce((sum, row) => sum + row.amount, 0),
      available: Math.max(totalDevFee - committed, 0),
      settings,
    };
  }

  private async buildBreakdown(role: 'MITRA' | 'YAYASAN', period?: string) {
    const periodStart = this.getPeriodStart(period);
    const users = await this.prisma.user.findMany({
      where: { role },
      select: { id: true, fullName: true, email: true, myReferralCode: true },
    });
    if (!users.length) return [];

    const userMap = new Map(users.map((user) => [user.id, user]));
    const rows = await this.prisma.referralTransaction.findMany({
      where: {
        userId: { in: users.map((user) => user.id) },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      },
    });

    const grouped = new Map<string, { amount: number; count: number; referralCode: string | null }>();
    for (const row of rows) {
      const current = grouped.get(row.userId) || { amount: 0, count: 0, referralCode: row.referralCode || null };
      current.amount += Number(row.commission || 0);
      current.count += 1;
      if (!current.referralCode && row.referralCode) current.referralCode = row.referralCode;
      grouped.set(row.userId, current);
    }

    return Array.from(grouped.entries())
      .map(([userId, summary]) => {
        const user = userMap.get(userId);
        return {
          _id: userId,
          id: userId,
          userId,
          name: user?.fullName || (role === Role.MITRA ? 'Mitra' : 'Yayasan'),
          email: user?.email || null,
          referralCode: summary.referralCode || user?.myReferralCode || null,
          transactionCount: summary.count,
          amount: summary.amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  async getRevenueSummary(period?: string) {
    const settings = await this.getFinanceSettings();
    const periodStart = this.getPeriodStart(period);
    const ledgers = await this.prisma.revenueLedger.findMany({
      where: periodStart ? { createdAt: { gte: periodStart } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const paymentOrderIds = Array.from(new Set(ledgers.map((row) => row.paymentOrderId).filter(Boolean))) as string[];
    const orders = paymentOrderIds.length
      ? await this.prisma.paymentOrder.findMany({
          where: { id: { in: paymentOrderIds } },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        })
      : [];
    const orderMap = new Map(orders.map((order) => [order.id, order]));

    const rows: RevenueRow[] = ledgers.map((ledger) => {
      const order = ledger.paymentOrderId ? orderMap.get(ledger.paymentOrderId) : null;
      const pricing = ((order?.metadata as Record<string, any> | null)?.pricing || {}) as Record<string, any>;
      const split = this.computeSplitFromPricing(Number(ledger.amount || 0), pricing, settings.devFeePercent, ledger);
      const jalur = this.getJalurFromPricing(pricing, ledger);
      return {
        id: ledger.id,
        amount: Number(ledger.amount || 0),
        jalur,
        status: 'approved',
        date: (order?.paidAt || order?.createdAt || ledger.createdAt).toISOString(),
        user: order?.user?.fullName || 'Pengguna',
        email: order?.user?.email || null,
        method: this.getOrderMethod(order),
        split,
      };
    });

    const developerWallet = await this.getDeveloperWallet(period);
    const mitraBreakdown = await this.buildBreakdown(Role.MITRA, period);
    const yayasanBreakdown = await this.buildBreakdown(Role.YAYASAN, period);

    const stats = rows.reduce(
      (acc, row) => {
        acc.totalAmount += row.amount;
        acc.totalCount += 1;
        acc.devFee += row.split.devFee;
        acc.newmeGross += row.split.newmeGross;
        acc.newmeNet += row.split.newmeNet;
        acc.mitraRevenue += row.split.mitraShare;
        acc.yayasanRevenue += row.split.yayasanShare;
        if (row.jalur === 'yayasan') {
          acc.yayasanAmount += row.amount;
          acc.yayasanCount += 1;
        } else {
          acc.individuAmount += row.amount;
          acc.individuCount += 1;
        }
        return acc;
      },
      {
        totalAmount: 0,
        totalCount: 0,
        individuAmount: 0,
        individuCount: 0,
        yayasanAmount: 0,
        yayasanCount: 0,
        newmeGross: 0,
        newmeNet: 0,
        devFee: 0,
        mitraRevenue: 0,
        yayasanRevenue: 0,
      },
    );

    return {
      ...stats,
      totalRevenue: stats.totalAmount,
      developerRevenue: stats.devFee,
      developerReserved: developerWallet.reserved,
      developerDisbursed: developerWallet.approved,
      devFeeBalance: developerWallet.available,
      devFeePercent: settings.devFeePercent,
      mitraBreakdown,
      yayasanBreakdown,
      recentRevenueRows: rows.slice(0, 50),
    };
  }

  async listTransactions(filters: { period?: string; jalur?: string; status?: string; search?: string; page?: string | number; pageSize?: string | number }) {
    const settings = await this.getFinanceSettings();
    const periodStart = this.getPeriodStart(filters.period);
    const orders = await this.prisma.paymentOrder.findMany({
      where: {
        paymentType: PaymentType.TEST_PAYMENT,
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
    const orderIds = orders.map((order) => order.id);
    const ledgers = orderIds.length
      ? await this.prisma.revenueLedger.findMany({
          where: { paymentOrderId: { in: orderIds } },
        })
      : [];
    const ledgerMap = new Map(ledgers.map((row) => [row.paymentOrderId, row]));

    const normalizedSearch = String(filters.search || '').trim().toLowerCase();
    const normalizedStatus = String(filters.status || '').trim().toLowerCase();
    const normalizedJalur = String(filters.jalur || '').trim().toLowerCase();

    const filteredRows = orders
      .map((order) => {
        const pricing = (((order.metadata as Record<string, any> | null)?.pricing) || {}) as Record<string, any>;
        const ledger = ledgerMap.get(order.id) || null;
        const status = toClientPaymentStatus(order.status);
        const jalur = this.getJalurFromPricing(pricing, ledger);
        const split = this.computeSplitFromPricing(Number(order.amount || 0), pricing, settings.devFeePercent, ledger || undefined);
        return {
          _id: order.id,
          id: order.id,
          orderId: order.orderId,
          userId: order.userId,
          user: order.user?.fullName || 'Pengguna',
          email: order.user?.email || null,
          jalur,
          amount: Number(order.amount || 0),
          method: this.getOrderMethod(order),
          status: status === 'unpaid' ? 'rejected' : status,
          date: (order.paidAt || order.createdAt).toISOString(),
          createdAt: order.createdAt.toISOString(),
          paidAt: order.paidAt ? order.paidAt.toISOString() : null,
          split,
        };
      })
      .filter((row) => !normalizedStatus || row.status === normalizedStatus)
      .filter((row) => !normalizedJalur || row.jalur === normalizedJalur)
      .filter((row) => {
        if (!normalizedSearch) return true;
        return `${row.user} ${row.email || ''} ${row.orderId}`.toLowerCase().includes(normalizedSearch);
      });

    const { page, pageSize } = resolvePagination(filters, { pageSize: 10, maxPageSize: 100 });
    const total = filteredRows.length;
    const start = (page - 1) * pageSize;
    const items = filteredRows.slice(start, start + pageSize);
    return buildPaginatedResult(items, total, page, pageSize);
  }

  async listDisbursements(filters: { type?: string; status?: string; search?: string; page?: string | number; pageSize?: string | number }) {
    const settings = await this.getFinanceSettings();
    const rows = await this.prisma.disbursement.findMany({
      where: {
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: String(filters.status).toUpperCase() as DisbursementStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const userIds = Array.from(new Set(rows.map((row) => row.userId).filter(Boolean))) as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    const normalizedSearch = String(filters.search || '').trim().toLowerCase();

    const mappedRows = rows
      .map((row) => {
        const owner = row.userId ? userMap.get(row.userId) : null;
        const mapped = mapDisbursementForClient(row, {
          type: row.type,
          name: owner?.fullName || (row.type === 'developer' ? 'Developer' : row.type === 'mitra' ? 'Mitra' : 'Yayasan'),
          email: owner?.email || (row.type === 'developer' ? null : null),
          bankName: row.bankName || (row.type === 'developer' ? parseWithdrawalNotes(row.notes).bankName || settings.devBankName : undefined),
          bankAccount: row.bankAccount || (row.type === 'developer' ? parseWithdrawalNotes(row.notes).bankAccount || settings.devBankAccount : undefined),
          accountName: row.accountName || (row.type === 'developer' ? parseWithdrawalNotes(row.notes).accountName || settings.devAccountName : undefined),
        });
        return {
          ...mapped,
          name: owner?.fullName || (row.type === 'developer' ? 'Developer' : row.type === 'mitra' ? 'Mitra' : 'Yayasan'),
          email: owner?.email || null,
          date: row.createdAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
          processedAt: row.processedAt ? row.processedAt.toISOString() : null,
        };
      });

    const filteredRows = mappedRows
      .filter((row) => {
        if (!normalizedSearch) return true;
        return `${row.name || ''} ${row.email || ''} ${row.bankName || ''} ${row.bankAccount || ''}`.toLowerCase().includes(normalizedSearch);
      });

    const { page, pageSize } = resolvePagination(filters, { pageSize: 10, maxPageSize: 100 });
    const total = filteredRows.length;
    const start = (page - 1) * pageSize;
    const items = filteredRows.slice(start, start + pageSize);
    return buildPaginatedResult(items, total, page, pageSize);
  }

  async processDisbursement(id: string, body: Record<string, any>) {
    return this.disbursementsService.processDisbursement(id, body, { type: body.type });
  }

  async createDeveloperDisbursement(body: Record<string, any>) {
    const amount = Math.max(Number(body.amount || 0), 0);
    if (!amount) {
      throw new BadRequestException('Jumlah pencairan developer belum valid');
    }

    const wallet = await this.getDeveloperWallet();
    if (amount > wallet.available) {
      throw new BadRequestException('Saldo developer tidak mencukupi');
    }

    return this.disbursementsService.createDisbursement({
      type: 'developer',
      amount,
      notes: body.notes || null,
      bankName: body.bankName || wallet.settings.devBankName || null,
      bankAccount: body.bankAccount || wallet.settings.devBankAccount || null,
      accountName: body.accountName || wallet.settings.devAccountName || null,
    });
  }
}
