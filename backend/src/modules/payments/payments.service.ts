import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentType, Prisma, Role, YayasanApprovalStatus } from '@prisma/client';

type PriceMapEntry = {
  referralPrice: number;
  totalPrice: number;
  mitraShare: number;
  yayasanShare: number;
};

type PricingContext = {
  basePrice: number;
  totalPrice: number;
  referralCode: string | null;
  referrerRole: Role | null;
  approvalStatus: string | null;
  referralActive: boolean;
  yayasanShare: number;
  mitraShare: number;
  yayasanReferralCode: string | null;
  mitraReferralCode: string | null;
  yayasanId: string | null;
  mitraId: string | null;
  userReferrerId: string | null;
};

type PrismaLike = Prisma.TransactionClient | PrismaService;

const PLATFORM_BASE_PRICE = 100000;
const REFERRAL_TOTAL_PRICE = 250000;
const REFERRAL_SHARE_BUDGET = REFERRAL_TOTAL_PRICE - PLATFORM_BASE_PRICE;
const USER_REFERRAL_BONUS = 10000;
const MIDTRANS_SANDBOX_APP_URL = 'https://app.sandbox.midtrans.com';
const MIDTRANS_PRODUCTION_APP_URL = 'https://app.midtrans.com';
const MIDTRANS_SANDBOX_API_URL = 'https://api.sandbox.midtrans.com';
const MIDTRANS_PRODUCTION_API_URL = 'https://api.midtrans.com';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private statusRank: Record<string, number> = {
    CREATED: 1,
    PENDING: 2,
    CAPTURE: 3,
    SETTLEMENT: 4,
    SUCCESS: 5,
    DENY: 9,
    CANCEL: 9,
    EXPIRE: 9,
    FAILURE: 9,
    REJECTED: 9,
  };

  private hash(input: string) {
    return createHash('sha256').update(input).digest('hex');
  }

  private isMidtransProduction() {
    return String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';
  }

  private getMidtransAppBaseUrl() {
    return this.isMidtransProduction() ? MIDTRANS_PRODUCTION_APP_URL : MIDTRANS_SANDBOX_APP_URL;
  }

  private getMidtransApiBaseUrl() {
    return this.isMidtransProduction() ? MIDTRANS_PRODUCTION_API_URL : MIDTRANS_SANDBOX_API_URL;
  }

  private getMidtransServerKey() {
    const serverKey = String(process.env.MIDTRANS_SERVER_KEY || '').trim();
    if (!serverKey) {
      throw new BadRequestException('MIDTRANS_SERVER_KEY belum dikonfigurasi.');
    }
    return serverKey;
  }

  private getMidtransHeaders() {
    const auth = Buffer.from(`${this.getMidtransServerKey()}:`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private getFrontendPaymentReturnUrl(orderId: string) {
    const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const params = new URLSearchParams({ tab: 'payment', orderId });
    return `${frontendUrl}/dashboard?${params.toString()}`;
  }

  private normalizePhoneNumber(value?: string | null) {
    if (!value) return undefined;
    const trimmed = String(value).trim();
    if (!trimmed) return undefined;
    const digits = trimmed.replace(/[^\d+]/g, '');
    return digits || undefined;
  }

  private getSnapTokenFromMetadata(metadata: any) {
    if (!metadata || typeof metadata !== 'object') return null;
    return metadata?.midtrans?.snapToken || metadata?.snapToken || null;
  }

  private hasUsableSnapSession(order: any) {
    const paymentUrl = String(order?.paymentUrl || '');
    const hasKnownSnapUrl = paymentUrl.startsWith(`${MIDTRANS_SANDBOX_APP_URL}/snap/`)
      || paymentUrl.startsWith(`${MIDTRANS_PRODUCTION_APP_URL}/snap/`);
    const snapToken = this.getSnapTokenFromMetadata(order?.metadata);
    return hasKnownSnapUrl && !!snapToken;
  }

  private async parseJsonResponse(response: Response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  private async createMidtransSnapTransaction(order: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User pembayaran tidak ditemukan.');
    }

    const itemName = order.paymentType === PaymentType.TEST_PAYMENT
      ? 'NEWME TEST PREMIUM'
      : 'NEWME PAYMENT';

    const payload = {
      transaction_details: {
        order_id: order.orderId,
        gross_amount: Number(order.amount),
      },
      item_details: [
        {
          id: order.paymentType,
          price: Number(order.amount),
          quantity: 1,
          name: itemName,
        },
      ],
      customer_details: {
        first_name: user.fullName || 'NEWME User',
        email: user.email || undefined,
        phone: this.normalizePhoneNumber(user.phone),
      },
      callbacks: {
        finish: this.getFrontendPaymentReturnUrl(order.orderId),
        unfinish: this.getFrontendPaymentReturnUrl(order.orderId),
        error: this.getFrontendPaymentReturnUrl(order.orderId),
      },
    };

    const response = await fetch(`${this.getMidtransAppBaseUrl()}/snap/v1/transactions`, {
      method: 'POST',
      headers: this.getMidtransHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await this.parseJsonResponse(response);

    if (!response.ok || !body?.redirect_url) {
      const detail = body?.error_messages?.join(', ')
        || body?.status_message
        || body?.message
        || 'Midtrans Snap gagal membuat transaksi.';
      throw new BadRequestException(detail);
    }

    const metadata = {
      ...((order.metadata && typeof order.metadata === 'object') ? order.metadata : {}),
      midtrans: {
        gateway: 'snap',
        environment: this.isMidtransProduction() ? 'production' : 'sandbox',
        snapToken: body.token || null,
        redirectUrl: body.redirect_url,
        createdAt: new Date().toISOString(),
      },
    };

    return this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        paymentUrl: body.redirect_url,
        metadata,
      },
    });
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

    const yayasanShare = Math.max(
      Math.min(value?.yayasanShare ?? value?.referralPrice ?? 0, REFERRAL_SHARE_BUDGET),
      0,
    );
    const mitraShare = Math.max(
      Math.min(value?.mitraShare ?? (REFERRAL_SHARE_BUDGET - yayasanShare), REFERRAL_SHARE_BUDGET),
      0,
    );
    const combinedShare = yayasanShare + mitraShare;
    const normalizedMitraShare =
      combinedShare > REFERRAL_SHARE_BUDGET ? REFERRAL_SHARE_BUDGET - yayasanShare : mitraShare;

    return {
      referralPrice: yayasanShare,
      yayasanShare,
      mitraShare: Math.max(normalizedMitraShare, 0),
      totalPrice: REFERRAL_TOTAL_PRICE,
    };
  }

  private async getBaseTestPrice(db: PrismaLike) {
    const paymentAmountRow = await db.setting.findUnique({ where: { key: 'paymentAmount' } });
    if (typeof paymentAmountRow?.value === 'number') {
      return Math.max(Number(paymentAmountRow.value), PLATFORM_BASE_PRICE);
    }

    const generalRow = await db.setting.findUnique({ where: { key: 'general' } });
    const generalValue = (generalRow?.value as Record<string, any>) || {};
    return Math.max(Number(generalValue.paymentAmount || generalValue.testPrice || PLATFORM_BASE_PRICE), PLATFORM_BASE_PRICE);
  }

  private async findMitraByCode(db: PrismaLike, code: string) {
    return db.user.findFirst({
      where: {
        role: Role.MITRA,
        OR: [
          { myReferralCode: code },
          { mitraProfile: { is: { inviteCode: code } } },
        ],
      },
      include: { mitraProfile: true },
    });
  }

  private async findUserByReferralCode(db: PrismaLike, code: string) {
    return db.user.findFirst({
      where: { role: Role.USER, myReferralCode: code },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });
  }

  async getTestPricing(userId?: string, referralCode?: string, db: PrismaLike = this.prisma): Promise<PricingContext> {
    const basePrice = await this.getBaseTestPrice(db);
    const user = userId
      ? await db.user.findUnique({
          where: { id: userId },
          include: { yayasanProfile: true, mitraProfile: true },
        })
      : null;

    const activeReferralCode = referralCode || user?.referredByCode || null;
    const defaultPricing: PricingContext = {
      basePrice,
      totalPrice: basePrice,
      referralCode: activeReferralCode,
      referrerRole: null,
      approvalStatus: null,
      referralActive: false,
      yayasanShare: 0,
      mitraShare: 0,
      yayasanReferralCode: null,
      mitraReferralCode: null,
      yayasanId: null,
      mitraId: null,
      userReferrerId: null,
    };

    if (!activeReferralCode) {
      return defaultPricing;
    }

    const yayasan = await db.user.findFirst({
      where: { role: Role.YAYASAN, myReferralCode: activeReferralCode },
      include: { yayasanProfile: true },
    });

    if (yayasan) {
      const approvalStatus = yayasan.yayasanProfile?.approvalStatus || null;
      const referralActive =
        yayasan.yayasanProfile?.approvalStatus === YayasanApprovalStatus.APPROVED
        && (yayasan.yayasanProfile?.isActive ?? true);
      let normalized = this.normalizePriceEntry({
        referralPrice: yayasan.yayasanProfile?.referralPrice ?? 0,
        mitraShare: yayasan.yayasanProfile?.mitraShare ?? 0,
      });
      let mitraId: string | null = null;
      let mitraReferralCode: string | null = null;

      if (yayasan.referredByCode) {
        const mitra = await this.findMitraByCode(db, yayasan.referredByCode);
        if (mitra) {
          const mapRow = await db.setting.findUnique({ where: { key: 'mitraYayasanPriceMap' } });
          const priceMap = (mapRow?.value as Record<string, number | PriceMapEntry>) || {};
          const legacyEntry = priceMap[`${mitra.id}:${yayasan.id}`];
          const shouldUseLegacy =
            !yayasan.yayasanProfile?.mitraShare
            && !yayasan.yayasanProfile?.referralPrice
            && !!legacyEntry;
          if (shouldUseLegacy) {
            normalized = this.normalizePriceEntry(legacyEntry ?? 0);
          }
          mitraId = mitra.id;
          mitraReferralCode = mitra.mitraProfile?.inviteCode || mitra.myReferralCode || yayasan.referredByCode;
        }
      } else {
        const yayasanShare = Math.max(
          Math.min(yayasan.yayasanProfile?.referralPrice ?? REFERRAL_SHARE_BUDGET, REFERRAL_SHARE_BUDGET),
          0,
        );
        normalized = {
          referralPrice: yayasanShare,
          yayasanShare,
          mitraShare: 0,
          totalPrice: REFERRAL_TOTAL_PRICE,
        };
      }

      return {
        basePrice,
        totalPrice: referralActive ? REFERRAL_TOTAL_PRICE : basePrice,
        referralCode: activeReferralCode,
        referrerRole: Role.YAYASAN,
        approvalStatus,
        referralActive,
        yayasanShare: normalized.yayasanShare,
        mitraShare: normalized.mitraShare,
        yayasanReferralCode: yayasan.myReferralCode || activeReferralCode,
        mitraReferralCode,
        yayasanId: yayasan.id,
        mitraId,
        userReferrerId: null,
      };
    }

    const mitra = await this.findMitraByCode(db, activeReferralCode);
    if (mitra) {
      return {
        ...defaultPricing,
        referrerRole: Role.MITRA,
        referralActive: true,
        mitraReferralCode: mitra.mitraProfile?.inviteCode || mitra.myReferralCode || activeReferralCode,
        mitraId: mitra.id,
      };
    }

    const userReferrer = await this.findUserByReferralCode(db, activeReferralCode);
    if (userReferrer) {
      return {
        ...defaultPricing,
        referrerRole: Role.USER,
        referralActive: true,
        userReferrerId: userReferrer.id,
      };
    }

    return defaultPricing;
  }

  generateOrderId(prefix = 'TXN') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  async createOrder(data: { userId: string; amount: number; paymentType: PaymentType; metadata?: any; idempotencyKey?: string; }) {
    const orderId = this.generateOrderId(data.paymentType === 'TOPUP' ? 'TOPUP' : 'PAY');
    const payment = await this.prisma.paymentOrder.create({
      data: {
        orderId,
        userId: data.userId,
        paymentType: data.paymentType,
        amount: data.amount,
        status: PaymentStatus.PENDING,
        idempotencyKey: data.idempotencyKey,
        metadata: data.metadata || {},
        paymentUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${orderId}`,
        qrisUrl: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${orderId}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.prisma.paymentEvent.create({
      data: {
        paymentOrderId: payment.id,
        toStatus: payment.status,
        source: 'api.create',
      },
    });

    return payment;
  }

  async createOrReuseSnapOrder(data: {
    userId: string;
    amount: number;
    paymentType: PaymentType;
    metadata?: any;
    idempotencyKey?: string;
  }) {
    const pendingOrder = data.paymentType === PaymentType.TEST_PAYMENT
      ? await this.getLatestPendingTestPayment(data.userId)
      : null;

    if (pendingOrder && this.hasUsableSnapSession(pendingOrder)) {
      return pendingOrder;
    }

    if (pendingOrder && !this.hasUsableSnapSession(pendingOrder)) {
      await this.applyOrderTransition(
        pendingOrder.orderId,
        PaymentStatus.EXPIRE,
        'midtrans.refresh.invalid-session',
        { reason: 'invalid_local_snap_session' },
      );
    }

    const order = await this.createOrder(data);
    try {
      return await this.createMidtransSnapTransaction(order);
    } catch (error) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentStatus.FAILURE,
          paymentUrl: null,
          qrisUrl: null,
        },
      });
      throw error;
    }
  }

  async getOrderByOrderId(orderId: string) {
    return this.prisma.paymentOrder.findUnique({ where: { orderId } });
  }

  async syncOrderStatusFromMidtrans(orderId: string) {
    const order = await this.getOrderByOrderId(orderId);
    if (!order || !this.hasUsableSnapSession(order)) {
      return order;
    }

    const response = await fetch(`${this.getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
      method: 'GET',
      headers: this.getMidtransHeaders(),
    });

    if (!response.ok) {
      return order;
    }

    const payload = await this.parseJsonResponse(response);
    const nextStatus = this.mapMidtransStatus(payload.transaction_status, payload.fraud_status);
    await this.applyOrderTransition(orderId, nextStatus, 'midtrans.status-check', payload);
    return this.getOrderByOrderId(orderId);
  }

  getSnapSession(order: any) {
    return {
      orderId: order?.orderId || null,
      paymentUrl: order?.paymentUrl || null,
      snapToken: this.getSnapTokenFromMetadata(order?.metadata),
      amount: order?.amount || 0,
    };
  }

  async listPayments() {
    return this.prisma.manualPaymentProof.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    });
  }

  listOrders(params?: { status?: string; userId?: string }) {
    return this.prisma.paymentOrder.findMany({
      where: {
        status: params?.status as any,
        userId: params?.userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async paymentStats() {
    const settledStatuses = [PaymentStatus.SETTLEMENT, PaymentStatus.CAPTURE, PaymentStatus.SUCCESS];
    const [manualTotal, manualApproved, manualPending, orderTotal, orderApproved, orderPending, orderRevenue] = await Promise.all([
      this.prisma.manualPaymentProof.count(),
      this.prisma.manualPaymentProof.count({ where: { status: PaymentStatus.SUCCESS } }),
      this.prisma.manualPaymentProof.count({ where: { status: PaymentStatus.PENDING } }),
      this.prisma.paymentOrder.count({ where: { paymentType: PaymentType.TEST_PAYMENT } }),
      this.prisma.paymentOrder.count({ where: { paymentType: PaymentType.TEST_PAYMENT, status: { in: settledStatuses } } }),
      this.prisma.paymentOrder.count({ where: { paymentType: PaymentType.TEST_PAYMENT, status: PaymentStatus.PENDING } }),
      this.prisma.paymentOrder.aggregate({
        where: { paymentType: PaymentType.TEST_PAYMENT, status: { in: settledStatuses } },
        _sum: { amount: true },
      }),
    ]);

    return {
      total: manualTotal + orderTotal,
      approved: manualApproved + orderApproved,
      pending: manualPending + orderPending,
      totalRevenue: Number(orderRevenue._sum.amount || 0),
      manualTotal,
      orderTotal,
    };
  }

  async uploadManualProof(data: { userId: string; amount: number; method: string; fileUrl: string }) {
    return this.prisma.manualPaymentProof.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        method: data.method,
        fileUrl: data.fileUrl,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async approveManualProof(id: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    const mapped = status === 'approved' ? PaymentStatus.SUCCESS : PaymentStatus.REJECTED;
    return this.prisma.manualPaymentProof.update({
      where: { id },
      data: { status: mapped, rejectionReason: rejectionReason || null },
    });
  }

  mapMidtransStatus(transactionStatus: string, fraudStatus?: string): PaymentStatus {
    const tx = (transactionStatus || '').toLowerCase();
    if (tx === 'settlement') return PaymentStatus.SETTLEMENT;
    if (tx === 'capture') return fraudStatus === 'accept' ? PaymentStatus.CAPTURE : PaymentStatus.PENDING;
    if (tx === 'pending') return PaymentStatus.PENDING;
    if (tx === 'deny') return PaymentStatus.DENY;
    if (tx === 'cancel') return PaymentStatus.CANCEL;
    if (tx === 'expire') return PaymentStatus.EXPIRE;
    return PaymentStatus.FAILURE;
  }

  verifyMidtransSignature(payload: any): boolean {
    const orderId = payload.order_id || payload.orderId;
    const statusCode = payload.status_code || payload.statusCode || '200';
    const grossAmount = payload.gross_amount || payload.grossAmount || String(payload.amount || 0);
    const signature = payload.signature_key || payload.signatureKey;
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const expected = createHash('sha512').update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest('hex');
    return expected === signature;
  }

  async saveWebhookInbox(payload: any) {
    const orderId = payload.order_id || payload.orderId;
    const eventKey = this.hash(JSON.stringify({
      orderId,
      transactionStatus: payload.transaction_status,
      fraudStatus: payload.fraud_status,
      signature: payload.signature_key,
    }));

    try {
      const row = await this.prisma.webhookInbox.create({
        data: {
          eventKey,
          orderId,
          signatureKey: payload.signature_key || '',
          payload,
        },
      });
      return { inserted: true, row };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { inserted: false };
      }
      throw error;
    }
  }

  async applyOrderTransition(orderId: string, newStatus: PaymentStatus, source: string, payload?: any) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({ where: { orderId } });
      if (!order) return { applied: false, reason: 'order_not_found' };

      await tx.$queryRawUnsafe('SELECT id FROM PaymentOrder WHERE id = ? FOR UPDATE', order.id);

      const currentRank = this.statusRank[order.status] || 0;
      const nextRank = this.statusRank[newStatus] || 0;
      if (nextRank < currentRank || (currentRank === nextRank && order.status === newStatus)) {
        return { applied: false, reason: 'stale_transition', status: order.status };
      }

      const updated = await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          midtransStatus: payload?.transaction_status || payload?.status || null,
          midtransFraudStatus: payload?.fraud_status || null,
          paidAt: newStatus === PaymentStatus.SETTLEMENT || newStatus === PaymentStatus.CAPTURE || newStatus === PaymentStatus.SUCCESS
            ? new Date()
            : order.paidAt,
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentOrderId: updated.id,
          fromStatus: order.status,
          toStatus: newStatus,
          source,
          payload: payload || {},
        },
      });

      const settledStatuses = new Set<PaymentStatus>([
        PaymentStatus.SETTLEMENT,
        PaymentStatus.CAPTURE,
        PaymentStatus.SUCCESS,
      ]);
      const successTransition = settledStatuses.has(newStatus) && !settledStatuses.has(order.status);

      if (successTransition) {
        await this.applySuccessEffect(tx, updated);
      }

      return { applied: true, status: updated.status };
    }, { timeout: Number(process.env.DB_TX_TIMEOUT_MS || 8000) });
  }

  private async applySuccessEffect(tx: Prisma.TransactionClient, order: any) {
    const wallet = await tx.wallet.upsert({
      where: { userId: order.userId },
      create: { userId: order.userId, availableBalance: 0, reserveBalance: 0 },
      update: {},
    });

    await tx.$queryRawUnsafe('SELECT id FROM Wallet WHERE id = ? FOR UPDATE', wallet.id);

    if (order.paymentType === PaymentType.TOPUP) {
      const before = wallet.availableBalance;
      const after = before + order.amount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { availableBalance: after } });
      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          entryType: 'CREDIT',
          amount: order.amount,
          balanceBefore: before,
          balanceAfter: after,
          referenceType: 'PAYMENT_ORDER',
          referenceId: order.id,
          note: 'Topup settlement',
        },
      });
    }

    if (order.paymentType === PaymentType.TEST_PAYMENT) {
      await this.applyTestPaymentSideEffects(tx, order);
    }
  }

  private async createReferralCommissionIfMissing(
    tx: Prisma.TransactionClient,
    input: { userId: string | null; referralCode: string | null; sourceOrderId: string; commission: number },
  ) {
    if (!input.userId || !input.referralCode || input.commission <= 0) {
      return;
    }

    const exists = await tx.referralTransaction.findFirst({
      where: {
        userId: input.userId,
        referralCode: input.referralCode,
        sourceOrderId: input.sourceOrderId,
      },
    });

    if (exists) {
      return;
    }

    await tx.referralTransaction.create({
      data: {
        userId: input.userId,
        referralCode: input.referralCode,
        sourceOrderId: input.sourceOrderId,
        commission: input.commission,
      },
    });
  }

  private async applyTestPaymentSideEffects(tx: Prisma.TransactionClient, order: any) {
    const pricing = await this.getTestPricing(order.userId, undefined, tx);
    const payingUser = await tx.user.findUnique({
      where: { id: order.userId },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    await tx.user.update({ where: { id: order.userId }, data: { paymentStatus: PaymentStatus.SUCCESS } });

    const ledgerExists = await tx.revenueLedger.findFirst({
      where: { sourceType: 'TEST_PAYMENT', sourceId: order.id },
    });

    if (!ledgerExists) {
      await tx.revenueLedger.create({
        data: {
          paymentOrderId: order.id,
          sourceType: 'TEST_PAYMENT',
          sourceId: order.id,
          amount: order.amount,
          newmeShare: Math.max(order.amount - pricing.yayasanShare - pricing.mitraShare, 0),
          mitraShare: pricing.mitraShare,
          yayasanShare: pricing.yayasanShare,
          developerFee: 0,
        },
      });
    }

    await this.createReferralCommissionIfMissing(tx, {
      userId: pricing.yayasanId,
      referralCode: pricing.yayasanReferralCode,
      sourceOrderId: order.orderId,
      commission: pricing.yayasanShare,
    });
    await this.createReferralCommissionIfMissing(tx, {
      userId: pricing.mitraId,
      referralCode: pricing.mitraReferralCode,
      sourceOrderId: order.orderId,
      commission: pricing.mitraShare,
    });

    const userReferrer = payingUser?.referredByCode
      ? await tx.user.findFirst({
          where: { role: Role.USER, myReferralCode: payingUser.referredByCode },
          select: { id: true, myReferralCode: true },
        })
      : null;

    await this.createReferralCommissionIfMissing(tx, {
      userId: userReferrer?.id || null,
      referralCode: userReferrer?.myReferralCode || null,
      sourceOrderId: order.orderId,
      commission: userReferrer ? USER_REFERRAL_BONUS : 0,
    });
  }

  async walletBalance(userId: string) {
    const wallet = await this.prisma.wallet.upsert({ where: { userId }, create: { userId, availableBalance: 0, reserveBalance: 0 }, update: {} });
    return { balance: wallet.availableBalance, reserve: wallet.reserveBalance };
  }

  async walletTransactions(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return [];
    return this.prisma.walletLedger.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' } });
  }

  getUserManualProofs(userId: string) {
    return this.prisma.manualPaymentProof.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getUserPaymentOrders(userId: string) {
    return this.prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async payTestWithWallet(userId: string, amount: number, description?: string) {
    const pricing = await this.getTestPricing(userId);
    const payableAmount = pricing.totalPrice || amount;
    const currentWallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, availableBalance: 0, reserveBalance: 0 },
      update: {},
    });
    if (currentWallet.availableBalance < payableAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({ where: { userId }, create: { userId, availableBalance: 0, reserveBalance: 0 }, update: {} });
      await tx.$queryRawUnsafe('SELECT id FROM Wallet WHERE id = ? FOR UPDATE', wallet.id);

      if (wallet.availableBalance < payableAmount) {
        throw new BadRequestException('Insufficient balance');
      }

      const before = wallet.availableBalance;
      const after = before - payableAmount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { availableBalance: after } });

      const order = await tx.paymentOrder.create({
        data: {
          orderId: this.generateOrderId('WALLET-PAY'),
          userId,
          paymentType: PaymentType.TEST_PAYMENT,
          amount: payableAmount,
          status: PaymentStatus.SUCCESS,
          metadata: { source: 'wallet', description: description || 'Pay test with wallet', pricing: await this.getTestPricing(userId, undefined, tx) },
          paidAt: new Date(),
        },
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          entryType: 'DEBIT',
          amount: payableAmount,
          balanceBefore: before,
          balanceAfter: after,
          referenceType: 'PAYMENT_ORDER',
          referenceId: order.id,
          note: description || 'Test payment',
        },
      });

      await this.applyTestPaymentSideEffects(tx, order);

      return { success: true, newBalance: after, orderId: order.orderId, amount: payableAmount };
    }, { timeout: Number(process.env.DB_TX_TIMEOUT_MS || 8000) });
  }

  async reconcilePending(windowMinutes: number) {
    const from = new Date(Date.now() - windowMinutes * 60 * 1000);
    const pending = await this.prisma.paymentOrder.findMany({
      where: {
        status: PaymentStatus.PENDING,
        createdAt: { gte: from },
        paymentType: PaymentType.TEST_PAYMENT,
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    let fixed = 0;
    for (const order of pending) {
      const before = order.status;
      const after = await this.syncOrderStatusFromMidtrans(order.orderId);
      if (after?.status && after.status !== before) {
        fixed += 1;
      }
    }

    return { checked: pending.length, fixed };
  }

  getLatestSuccessfulTestPayment(userId: string) {
    return this.prisma.paymentOrder.findFirst({
      where: {
        userId,
        paymentType: PaymentType.TEST_PAYMENT,
        status: { in: [PaymentStatus.SETTLEMENT, PaymentStatus.CAPTURE, PaymentStatus.SUCCESS] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getLatestPendingTestPayment(userId: string) {
    return this.prisma.paymentOrder.findFirst({
      where: {
        userId,
        paymentType: PaymentType.TEST_PAYMENT,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
