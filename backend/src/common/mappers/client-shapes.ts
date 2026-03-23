import { AccountStatus, PaymentStatus, TestStatus } from '@prisma/client';

type AnyRecord = Record<string, any>;

const APPROVED_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.SUCCESS,
  PaymentStatus.SETTLEMENT,
  PaymentStatus.CAPTURE,
]);

export function toClientPaymentStatus(status?: PaymentStatus | string | null) {
  if (!status) return 'unpaid';
  if (APPROVED_PAYMENT_STATUSES.has(status as PaymentStatus)) return 'approved';
  if (String(status).toUpperCase() === PaymentStatus.PENDING) return 'pending';
  if (String(status).toUpperCase() === PaymentStatus.REJECTED) return 'rejected';
  return 'unpaid';
}

export function toClientTestStatus(status?: TestStatus | string | null) {
  if (!status) return 'not_started';
  const normalized = String(status).toUpperCase();
  if (normalized === TestStatus.COMPLETED) return 'completed';
  if (normalized === TestStatus.IN_PROGRESS) return 'in_progress';
  return 'not_started';
}

export function toClientAccountStatus(status?: AccountStatus | string | null) {
  if (!status) return 'inactive';
  return String(status).toLowerCase();
}

export function formatClientDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function encodeWithdrawalNotes(input: {
  notes?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  accountName?: string | null;
}) {
  return JSON.stringify({
    kind: 'withdrawal-meta',
    notes: input.notes || null,
    bankName: input.bankName || null,
    bankAccount: input.bankAccount || null,
    accountName: input.accountName || null,
  });
}

export function parseWithdrawalNotes(notes?: string | null) {
  if (!notes) {
    return {
      notes: null,
      bankName: null,
      bankAccount: null,
      accountName: null,
    };
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed.kind === 'withdrawal-meta') {
      return {
        notes: parsed.notes || null,
        bankName: parsed.bankName || null,
        bankAccount: parsed.bankAccount || null,
        accountName: parsed.accountName || null,
      };
    }
  } catch {
    // Keep backwards compatibility with plain text notes.
  }

  return {
    notes,
    bankName: null,
    bankAccount: null,
    accountName: null,
  };
}

export function mapUserForClient(user: AnyRecord | null | undefined, extra: AnyRecord = {}) {
  if (!user) return null;

  const profile = user.profile || {};
  const profileExtra = profile.extra && typeof profile.extra === 'object' ? profile.extra : {};
  const yayasanProfile = user.yayasanProfile || {};
  const mitraProfile = user.mitraProfile || {};
  const wallet = user.wallet || {};
  const capacityLimit = extra.capacityLimit ?? mitraProfile.capacityLimit ?? null;
  const capacityUsed = extra.capacityUsed ?? mitraProfile.capacityUsed ?? 0;

  const phone = extra.whatsapp || user.phone || profile.whatsapp || null;
  const referralPrice = extra.referralPrice ?? yayasanProfile.referralPrice ?? 0;
  const yayasanShare = extra.yayasanShare ?? referralPrice;
  const mitraShare = extra.mitraShare ?? 0;
  const totalPrice = extra.totalPrice ?? (100000 + mitraShare + yayasanShare);
  const approvalStatus = extra.approvalStatus ?? yayasanProfile.approvalStatus ?? null;
  const isMitraApproved = extra.isMitraApproved ?? approvalStatus === 'APPROVED';
  const referralActive = extra.referralActive ?? (user.role === 'YAYASAN' ? isMitraApproved : true);

  return {
    ...user,
    ...extra,
    _id: user.id,
    id: user.id,
    publicId: extra.publicId ?? user.myReferralCode ?? null,
    businessId: extra.businessId ?? user.myReferralCode ?? null,
    memberCode: extra.memberCode ?? user.myReferralCode ?? null,
    name: extra.name || user.fullName,
    username: extra.username || user.username || user.fullName,
    fullName: user.fullName,
    adminRoleId: extra.adminRoleId ?? user.adminRoleId ?? null,
    adminRole: extra.adminRole ?? user.adminRole ?? null,
    permissionKeys: extra.permissionKeys ?? user.permissionKeys ?? [],
    isProtectedAdminRole: extra.isProtectedAdminRole ?? user.isProtectedAdminRole ?? false,
    phone,
    whatsapp: phone,
    birthDate: extra.birthDate ?? formatClientDate(profile.birthDate),
    province: extra.province ?? profile.province ?? null,
    city: extra.city ?? profile.city ?? null,
    district: extra.district ?? profile.district ?? null,
    village: extra.village ?? profile.village ?? null,
    address: extra.address ?? profile.address ?? profileExtra.address ?? null,
    userType: extra.userType ?? profileExtra.userType ?? (user.role === 'YAYASAN' ? 'institution' : 'individual'),
    institutionAddress: extra.institutionAddress ?? profileExtra.institutionAddress ?? null,
    position: extra.position ?? profileExtra.position ?? null,
    description: extra.description ?? profileExtra.description ?? null,
    referralSource: extra.referralSource ?? profileExtra.referralSource ?? null,
    referralOther: extra.referralOther ?? profileExtra.referralOther ?? null,
    referralCode: extra.referralCode ?? user.myReferralCode ?? null,
    myReferralCode: user.myReferralCode ?? null,
    usedReferralCode: extra.usedReferralCode ?? user.referredByCode ?? null,
    referredByCode: user.referredByCode ?? null,
    paymentStatus: extra.paymentStatus ?? toClientPaymentStatus(user.paymentStatus),
    freeTestStatus: extra.freeTestStatus ?? toClientTestStatus(user.freeTestStatus),
    paidTestStatus: extra.paidTestStatus ?? toClientTestStatus(user.paidTestStatus),
    status: extra.status ?? toClientAccountStatus(user.status),
    isBanned: extra.isBanned ?? user.status === AccountStatus.BANNED,
    isActive: extra.isActive ?? yayasanProfile.isActive ?? mitraProfile.isActive ?? user.status === AccountStatus.ACTIVE,
    isVerified: extra.isVerified ?? yayasanProfile.isVerified ?? mitraProfile.isVerified ?? user.status === AccountStatus.ACTIVE,
    approvalStatus,
    isMitraApproved,
    referralActive,
    approvedAt: extra.approvedAt ?? yayasanProfile.approvedAt ?? null,
    approvedByMitraId: extra.approvedByMitraId ?? yayasanProfile.approvedByMitraId ?? null,
    approvalLockedAt: extra.approvalLockedAt ?? yayasanProfile.approvalLockedAt ?? null,
    referralCount: extra.referralCount ?? 0,
    referralBonus: extra.referralBonus ?? 0,
    institutionName: extra.institutionName ?? profileExtra.institutionName ?? yayasanProfile.institutionName ?? null,
    inviteCode: extra.inviteCode ?? mitraProfile.inviteCode ?? null,
    inviteStatus: extra.inviteStatus ?? null,
    inviteExpiresAt: extra.inviteExpiresAt ?? null,
    inviteClaimedAt: extra.inviteClaimedAt ?? null,
    capacityLimit,
    capacityUsed,
    capacityRemaining:
      extra.capacityRemaining
      ?? (capacityLimit === null ? null : Math.max(Number(capacityLimit || 0) - Number(capacityUsed || 0), 0)),
    isCapacityFull:
      extra.isCapacityFull
      ?? (capacityLimit === null ? false : Number(capacityUsed || 0) >= Number(capacityLimit || 0)),
    referralMeta: extra.referralMeta ?? profileExtra.referralMeta ?? null,
    referralOwnerRole: extra.referralOwnerRole ?? profileExtra.referralOwnerRole ?? profileExtra.referralMeta?.referrerRole ?? null,
    affiliationType: extra.affiliationType ?? profileExtra.affiliationType ?? null,
    isYayasanLinked: extra.isYayasanLinked ?? profileExtra.isYayasanLinked ?? false,
    yayasanId: extra.yayasanId ?? profileExtra.yayasanId ?? profileExtra.referralMeta?.yayasanId ?? null,
    yayasanName: extra.yayasanName ?? profileExtra.yayasanName ?? profileExtra.referralMeta?.yayasanName ?? null,
    yayasanEmail: extra.yayasanEmail ?? profileExtra.yayasanEmail ?? profileExtra.referralMeta?.yayasanEmail ?? null,
    yayasanReferralCode:
      extra.yayasanReferralCode ?? profileExtra.yayasanReferralCode ?? profileExtra.referralMeta?.yayasanCode ?? null,
    mitraId: extra.mitraId ?? profileExtra.mitraId ?? profileExtra.referralMeta?.parentMitraId ?? null,
    mitraName: extra.mitraName ?? profileExtra.mitraName ?? profileExtra.referralMeta?.parentMitraName ?? null,
    mitraEmail: extra.mitraEmail ?? profileExtra.mitraEmail ?? profileExtra.referralMeta?.parentMitraEmail ?? null,
    mitraInviteCode:
      extra.mitraInviteCode ?? profileExtra.mitraInviteCode ?? profileExtra.referralMeta?.parentMitraCode ?? null,
    referralPrice,
    yayasanShare,
    mitraShare,
    totalPrice,
    balance: extra.balance ?? wallet.availableBalance ?? 0,
    walletBalance: extra.walletBalance ?? wallet.availableBalance ?? 0,
    reserveBalance: extra.reserveBalance ?? wallet.reserveBalance ?? 0,
  };
}

export function mapDisbursementForClient(disbursement: AnyRecord, extra: AnyRecord = {}) {
  const meta = parseWithdrawalNotes(disbursement.notes);

  return {
    ...disbursement,
    ...extra,
    _id: disbursement.id,
    id: disbursement.id,
    type: extra.type || 'withdrawal',
    status: String(disbursement.status || '').toLowerCase(),
    notes: extra.notes ?? meta.notes,
    bankName: extra.bankName ?? disbursement.bankName ?? meta.bankName,
    bankAccount: extra.bankAccount ?? disbursement.bankAccount ?? meta.bankAccount,
    accountName: extra.accountName ?? disbursement.accountName ?? meta.accountName,
    provider: extra.provider ?? disbursement.provider ?? 'manual',
    providerReferenceId: extra.providerReferenceId ?? disbursement.providerReferenceId ?? null,
    providerStatus: extra.providerStatus ?? disbursement.providerStatus ?? null,
    providerPayload: extra.providerPayload ?? disbursement.providerPayload ?? null,
    failureReason: extra.failureReason ?? disbursement.failureReason ?? null,
    submittedAt: extra.submittedAt ?? disbursement.submittedAt ?? null,
    completedAt: extra.completedAt ?? disbursement.completedAt ?? null,
  };
}
