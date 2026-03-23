import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, DisbursementStatus, MitraInviteStatus, PaymentOpsAlertStatus, PaymentStatus, Role, YayasanApprovalStatus } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'crypto';
import { mapUserForClient } from 'src/common/mappers/client-shapes';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { AdminRbacService } from '../admin-rbac/admin-rbac.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ClaimMitraInviteDto } from './dto/claim-mitra-invite.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const USER_IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const STAFF_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const USER_WARNING_THRESHOLD_MS = 3 * 60 * 1000;
const STAFF_WARNING_THRESHOLD_MS = 2 * 60 * 1000;
const USER_ACCESS_TOKEN_TTL = '20m';
const STAFF_ACCESS_TOKEN_TTL = '15m';
const ADMIN_LOGIN_LOCK_THRESHOLD = Number(process.env.ADMIN_LOGIN_LOCK_THRESHOLD || 3);
const ADMIN_LOGIN_LOCK_WINDOW_MS = Number(process.env.ADMIN_LOGIN_LOCK_WINDOW_MINUTES || 15) * 60 * 1000;
const MITRA_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MITRA_PLACEHOLDER_EMAIL_DOMAIN = 'pending-mitra.newme.local';

type AuditInput = {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  payload?: Record<string, any>;
  ipAddress?: string | null;
};

type SessionMetadata = {
  id: string;
  idleTimeoutMs: number;
  warningThresholdMs: number;
  expiresAt: Date;
  serverTime: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly adminRbacService: AdminRbacService,
  ) {}

  private isStaffRole(role: Role) {
    return (
      role === Role.ADMIN ||
      role === Role.SUPERADMIN ||
      role === Role.OPERATOR ||
      role === Role.DEVELOPER ||
      role === Role.MITRA ||
      role === Role.YAYASAN
    );
  }

  private isAdminPanelRole(role?: Role | null) {
    return (
      role === Role.ADMIN ||
      role === Role.SUPERADMIN ||
      role === Role.OPERATOR ||
      role === Role.DEVELOPER
    );
  }

  private resolveManagedAdminRole(rawRole?: string | null) {
    const normalized = String(rawRole || '').trim().toUpperCase();
    if (normalized === Role.SUPERADMIN) return Role.SUPERADMIN;
    if (normalized === Role.OPERATOR) return Role.OPERATOR;
    return Role.ADMIN;
  }

  private normalizeUsername(username?: string | null) {
    return String(username || '').trim().toLowerCase();
  }

  private getIdleTimeoutMs(role: Role) {
    return role === Role.USER ? USER_IDLE_TIMEOUT_MS : STAFF_IDLE_TIMEOUT_MS;
  }

  private getWarningThresholdMs(role: Role) {
    return role === Role.USER ? USER_WARNING_THRESHOLD_MS : STAFF_WARNING_THRESHOLD_MS;
  }

  private getAccessTokenExpiresIn(role: Role) {
    return role === Role.USER ? USER_ACCESS_TOKEN_TTL : STAFF_ACCESS_TOKEN_TTL;
  }

  private createAccessToken(user: { id: string; role: Role; email: string }, sessionId: string) {
    return this.jwtService.sign(
      { sub: user.id, role: user.role, email: user.email, sid: sessionId },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: this.getAccessTokenExpiresIn(user.role),
      },
    );
  }

  private buildSessionMetadata(user: { role: Role }, session: { id: string; expiresAt: Date }): SessionMetadata {
    return {
      id: session.id,
      idleTimeoutMs: this.getIdleTimeoutMs(user.role),
      warningThresholdMs: this.getWarningThresholdMs(user.role),
      expiresAt: session.expiresAt,
      serverTime: new Date(),
    };
  }

  private async createAuthSession(
    user: { id: string; role: Role },
    meta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const expiresAt = new Date(Date.now() + this.getIdleTimeoutMs(user.role));
    const refreshTokenHash = this.hashValue(randomBytes(32).toString('hex'));
    return this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        expiresAt,
      },
    });
  }

  private async getValidSessionOrThrow(userId: string, sessionId?: string | null) {
    const normalizedSessionId = String(sessionId || '').trim();
    if (!normalizedSessionId) {
      throw new UnauthorizedException('Invalid session');
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        id: normalizedSessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired');
    }

    return session;
  }

  private async extendSession(sessionId: string, role: Role) {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(Date.now() + this.getIdleTimeoutMs(role)),
        revokedAt: null,
      },
    });
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private randomCode(prefix: string): string {
    return `${prefix}${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private normalizeEmail(email: string) {
    return String(email || '').trim().toLowerCase();
  }

  private normalizeAdminLoginIdentifier(identifier?: string | null) {
    const normalized = String(identifier || '').trim();
    if (!normalized) return '';
    return normalized.includes('@') ? this.normalizeEmail(normalized) : this.normalizeUsername(normalized);
  }

  private normalizePhone(phone?: string | null) {
    const value = String(phone || '').replace(/\s+/g, '').trim();
    return value || null;
  }

  private normalizeReferralCode(code?: string | null) {
    const value = String(code || '').trim().toUpperCase();
    return value || null;
  }

  private parseBirthDate(value?: string | null) {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) {
      throw new BadRequestException('birthDate must be a valid date in YYYY-MM-DD format');
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const currentYear = new Date().getUTCFullYear();

    if (year < 1900 || year > currentYear) {
      throw new BadRequestException('birthDate must be a realistic date');
    }

    const parsed = new Date(Date.UTC(year, month - 1, day));
    const isSameDate =
      Number.isFinite(parsed.getTime()) &&
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;

    if (!isSameDate) {
      throw new BadRequestException('birthDate must be a valid calendar date');
    }

    return parsed;
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
    Object.entries(params || {}).forEach(([key, value]) => {
      const normalized = String(value || '').trim();
      if (normalized) {
        url.searchParams.set(key, normalized);
      }
    });
    return url.toString();
  }

  private isMitraPlaceholderEmail(email?: string | null) {
    return String(email || '').trim().toLowerCase().endsWith(`@${MITRA_PLACEHOLDER_EMAIL_DOMAIN}`);
  }

  private buildPendingMitraEmail(publicCode: string) {
    return `mitra-${String(publicCode || '').trim().toLowerCase()}@${MITRA_PLACEHOLDER_EMAIL_DOMAIN}`;
  }

  private buildMitraInviteResponse(invite: any, plainToken?: string | null) {
    const status = this.resolveInviteStatus(invite);
    return {
      id: invite?.id || null,
      status,
      sentAt: invite?.sentAt || invite?.createdAt || null,
      expiresAt: invite?.expiresAt || null,
      claimedAt: invite?.claimedAt || null,
      revokedAt: invite?.revokedAt || null,
      inviteUrl: plainToken ? this.buildFrontendUrl('/mitra/claim', { token: plainToken }) : null,
    };
  }

  private resolveInviteStatus(invite?: any) {
    if (!invite) return null;
    if (invite.status === MitraInviteStatus.PENDING && invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return MitraInviteStatus.EXPIRED;
    }
    return invite.status || null;
  }

  private async getLatestMitraInvite(userId: string) {
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

  private async countManagedYayasanForMitra(mitraUserId: string, inviteCode?: string | null) {
    const code = String(inviteCode || '').trim();
    return this.prisma.user.count({
      where: {
        role: Role.YAYASAN,
        OR: [
          { yayasanProfile: { is: { managedByMitraId: mitraUserId } } },
          ...(code ? [{ referredByCode: code }] : []),
        ],
      },
    });
  }

  private async syncMitraCapacityUsage(mitraUserId: string) {
    const mitra = await this.prisma.user.findUnique({
      where: { id: mitraUserId },
      include: { mitraProfile: true },
    });
    if (!mitra?.mitraProfile) {
      return { capacityLimit: 35, capacityUsed: 0, capacityRemaining: 35, isCapacityFull: false };
    }

    const inviteCode = mitra.mitraProfile.inviteCode || mitra.myReferralCode || null;
    const capacityUsed = await this.countManagedYayasanForMitra(mitraUserId, inviteCode);
    if (capacityUsed !== Number(mitra.mitraProfile.capacityUsed || 0)) {
      await this.prisma.mitraProfile.update({
        where: { userId: mitraUserId },
        data: {
          capacityUsed,
          capacityUpdatedAt: new Date(),
        },
      });
    }

    const capacityLimit = Number(mitra.mitraProfile.capacityLimit || 35);
    return {
      capacityLimit,
      capacityUsed,
      capacityRemaining: Math.max(capacityLimit - capacityUsed, 0),
      isCapacityFull: capacityUsed >= capacityLimit,
    };
  }

  private async assertMitraHasCapacity(mitraUserId: string, inviteCode?: string | null) {
    const mitra = await this.prisma.user.findUnique({
      where: { id: mitraUserId },
      include: { mitraProfile: true },
    });
    if (!mitra?.mitraProfile) {
      throw new BadRequestException('Mitra profile not found');
    }

    const capacityUsed = await this.countManagedYayasanForMitra(
      mitraUserId,
      inviteCode || mitra.mitraProfile.inviteCode || mitra.myReferralCode || null,
    );
    const capacityLimit = Number(mitra.mitraProfile.capacityLimit || 35);

    if (capacityUsed >= capacityLimit) {
      await this.prisma.mitraProfile.update({
        where: { userId: mitraUserId },
        data: {
          capacityUsed,
          capacityUpdatedAt: new Date(),
        },
      });
      throw new BadRequestException(
        `Kapasitas yayasan untuk mitra ini sudah penuh (${capacityUsed}/${capacityLimit}). Hubungi admin NEWME untuk penambahan kapasitas.`,
      );
    }
  }

  private getBusinessPrefix(role: Role) {
    if (role === Role.MITRA) return 'M';
    if (role === Role.YAYASAN) return 'Y';
    if (role === Role.USER) return 'U';
    if (role === Role.DEVELOPER) return 'D';
    return 'A';
  }

  private async generateUniqueBusinessCode(role: Role) {
    const prefix = this.getBusinessPrefix(role);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const code = `${prefix}${String(randomInt(0, 100000)).padStart(5, '0')}`;
      const exists = await this.prisma.user.findFirst({
        where: { myReferralCode: code },
        select: { id: true },
      });
      if (!exists) {
        return code;
      }
    }
    throw new ConflictException('Unable to generate unique referral code');
  }

  private async createAuditLog(input: AuditInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId || null,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId || null,
          payload: input.payload || {},
          ipAddress: input.ipAddress || null,
        },
      });
    } catch {
      // Audit logging must never block the main request flow.
    }
  }

  private extractAuditLoginIdentifier(payload: any) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const login =
      typeof payload.login === 'string'
        ? this.normalizeAdminLoginIdentifier(payload.login)
        : typeof payload.username === 'string'
          ? this.normalizeAdminLoginIdentifier(payload.username)
          : typeof payload.email === 'string'
            ? this.normalizeAdminLoginIdentifier(payload.email)
            : null;
    return login || null;
  }

  private async getRecentAdminAuthActivity(login: string, ipAddress?: string | null) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        targetType: 'auth',
        action: { in: ['ADMIN_LOGIN_FAILED', 'ADMIN_LOGIN_SUCCESS'] },
        createdAt: {
          gte: new Date(Date.now() - ADMIN_LOGIN_LOCK_WINDOW_MS),
        },
        ...(ipAddress ? { ipAddress } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        action: true,
        createdAt: true,
        payload: true,
      },
    });

    return rows.filter((row) => this.extractAuditLoginIdentifier(row.payload) === login);
  }

  private async assertAdminLoginNotLocked(login: string, ipAddress?: string | null) {
    const recentActivity = await this.getRecentAdminAuthActivity(login, ipAddress);
    const latestSuccessAt = recentActivity.find((row) => row.action === 'ADMIN_LOGIN_SUCCESS')?.createdAt?.getTime() || 0;
    const failuresSinceSuccess = recentActivity.filter((row) => {
      if (row.action !== 'ADMIN_LOGIN_FAILED') return false;
      return row.createdAt.getTime() > latestSuccessAt;
    });

    if (failuresSinceSuccess.length < ADMIN_LOGIN_LOCK_THRESHOLD) {
      return;
    }

    await this.createAuditLog({
      action: 'ADMIN_LOGIN_LOCKED',
      targetType: 'auth',
      payload: {
        login,
        reason: 'too_many_failed_attempts',
        attempts: failuresSinceSuccess.length,
        lockWindowMinutes: Math.round(ADMIN_LOGIN_LOCK_WINDOW_MS / 60000),
      },
      ipAddress: ipAddress || null,
    });

    throw new HttpException(
      `Akses admin dikunci sementara. Coba lagi dalam ${Math.round(ADMIN_LOGIN_LOCK_WINDOW_MS / 60000)} menit.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async findReferralOwner(code: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { myReferralCode: code },
          { mitraProfile: { is: { inviteCode: code } } },
        ],
      },
      include: {
        profile: true,
        wallet: true,
        yayasanProfile: true,
        mitraProfile: true,
      },
    });
  }

  private async findMitraByCode(code?: string | null) {
    const normalizedCode = this.normalizeReferralCode(code);
    if (!normalizedCode) return null;

    return this.prisma.user.findFirst({
      where: {
        role: Role.MITRA,
        OR: [
          { myReferralCode: normalizedCode },
          { mitraProfile: { is: { inviteCode: normalizedCode } } },
        ],
      },
      include: { mitraProfile: true },
    });
  }

  private async findYayasanByCode(code?: string | null) {
    const normalizedCode = this.normalizeReferralCode(code);
    if (!normalizedCode) return null;

    return this.prisma.user.findFirst({
      where: {
        role: Role.YAYASAN,
        myReferralCode: normalizedCode,
      },
      include: { yayasanProfile: true },
    });
  }

  private isActiveReferralOwner(user: any) {
    if (!user) return false;
    if (user.status === AccountStatus.BANNED || user.status === AccountStatus.INACTIVE) return false;
    if (user.role === Role.MITRA) {
      return user.mitraProfile ? (user.mitraProfile.isActive ?? true) : true;
    }
    if (user.role === Role.YAYASAN) {
      return user.yayasanProfile
        ? (user.yayasanProfile.isActive ?? true) && user.yayasanProfile.approvalStatus === YayasanApprovalStatus.APPROVED
        : false;
    }
    return user.status === AccountStatus.ACTIVE;
  }

  private async resolveReferralContext(role: Role, rawCode?: string | null) {
    const referralCode = this.normalizeReferralCode(rawCode);
    if (role === Role.YAYASAN && !referralCode) {
      throw new BadRequestException('Yayasan registration requires an active mitra referral code');
    }
    if (!referralCode) {
      return {
        referredByCode: null,
        referrer: null,
        profileExtra: {},
      };
    }

    const referrer = await this.findReferralOwner(referralCode);
    if (!referrer) {
      throw new BadRequestException('Referral code not found');
    }
    if (!this.isActiveReferralOwner(referrer)) {
      throw new BadRequestException('Referral owner is not active');
    }

    if (role === Role.YAYASAN && referrer.role !== Role.MITRA) {
      throw new BadRequestException('Yayasan registration requires an active mitra referral code');
    }

    if (role === Role.USER && referrer.role === Role.MITRA) {
      throw new BadRequestException('User registration cannot use a mitra referral code directly');
    }

    if (role !== Role.USER && referrer.role === Role.USER) {
      throw new BadRequestException('Referral code is not valid for this registration flow');
    }

    const canonicalCode = referrer.mitraProfile?.inviteCode || referrer.myReferralCode || referralCode;
    const profileExtra: Record<string, any> = {
      referralOwnerRole: referrer.role,
      referralMeta: {
        referrerId: referrer.id,
        referrerRole: referrer.role,
        referrerCode: canonicalCode,
      },
    };

    if (role === Role.YAYASAN && referrer.role === Role.MITRA) {
      profileExtra.affiliationType = 'mitra';
      profileExtra.mitraId = referrer.id;
      profileExtra.mitraName = referrer.fullName || null;
      profileExtra.mitraEmail = referrer.email || null;
      profileExtra.mitraInviteCode = canonicalCode;
      profileExtra.referralMeta.parentMitraId = referrer.id;
      profileExtra.referralMeta.parentMitraName = referrer.fullName || null;
      profileExtra.referralMeta.parentMitraEmail = referrer.email || null;
      profileExtra.referralMeta.parentMitraCode = canonicalCode;
    }

    if (role === Role.USER && referrer.role === Role.YAYASAN) {
      const institutionName = referrer.yayasanProfile?.institutionName || referrer.fullName || 'Yayasan';
      profileExtra.userType = 'institution';
      profileExtra.institutionName = institutionName;
      profileExtra.affiliationType = 'yayasan';
      profileExtra.isYayasanLinked = true;
      profileExtra.yayasanId = referrer.id;
      profileExtra.yayasanName = institutionName;
      profileExtra.yayasanEmail = referrer.email || null;
      profileExtra.yayasanReferralCode = referrer.myReferralCode || canonicalCode;
      profileExtra.referralMeta.yayasanId = referrer.id;
      profileExtra.referralMeta.yayasanName = institutionName;
      profileExtra.referralMeta.yayasanEmail = referrer.email || null;
      profileExtra.referralMeta.yayasanCode = referrer.myReferralCode || canonicalCode;
    }

    if (role === Role.USER && referrer.role === Role.YAYASAN && referrer.referredByCode) {
      const parentMitra = await this.findReferralOwner(referrer.referredByCode);
      if (parentMitra?.role === Role.MITRA) {
        profileExtra.referralMeta.parentMitraId = parentMitra.id;
        profileExtra.referralMeta.parentMitraName = parentMitra.fullName || null;
        profileExtra.referralMeta.parentMitraEmail = parentMitra.email || null;
        profileExtra.referralMeta.parentMitraCode =
          parentMitra.mitraProfile?.inviteCode || parentMitra.myReferralCode || referrer.referredByCode;
        profileExtra.mitraId = parentMitra.id;
        profileExtra.mitraName = parentMitra.fullName || null;
        profileExtra.mitraEmail = parentMitra.email || null;
        profileExtra.mitraInviteCode =
          parentMitra.mitraProfile?.inviteCode || parentMitra.myReferralCode || referrer.referredByCode;
      }
    }

    return {
      referredByCode: canonicalCode,
      referrer,
      profileExtra,
    };
  }

  private async computeReferralStats(user: any) {
    if (!user?.myReferralCode) {
      return { referralCount: 0, referralBonus: 0 };
    }

    const [referralCount, referralBonus] = await Promise.all([
      this.prisma.user.count({ where: { referredByCode: user.myReferralCode } }),
      this.prisma.referralTransaction.aggregate({
        where: { userId: user.id, referralCode: user.myReferralCode },
        _sum: { commission: true },
      }),
    ]);

    return {
      referralCount,
      referralBonus: referralBonus._sum.commission || 0,
    };
  }

  private async mapUserWithComputedStats(user: any) {
    if (!user) return null;

    const profileExtra =
      user.profile?.extra && typeof user.profile.extra === 'object'
        ? (user.profile.extra as Record<string, any>)
        : {};
    const stats = await this.computeReferralStats(user);
    const affiliation = await this.buildAffiliationContext(user, profileExtra);
    const mitraCapacity =
      user.role === Role.MITRA
        ? await this.syncMitraCapacityUsage(user.id)
        : null;
    const latestMitraInvite =
      user.role === Role.MITRA
        ? await this.getLatestMitraInvite(user.id)
        : null;
    const adminAccess = this.isAdminPanelRole(user.role)
      ? await this.adminRbacService.getAdminAccessContext(user.id)
      : null;

    return mapUserForClient(user, {
      address: profileExtra.address || null,
      institutionAddress: affiliation.institutionAddress ?? profileExtra.institutionAddress ?? null,
      position: profileExtra.position || null,
      description: profileExtra.description || null,
      userType:
        affiliation.userType ?? profileExtra.userType ?? (user.role === Role.YAYASAN ? 'institution' : 'individual'),
      referralSource: profileExtra.referralSource || null,
      referralOther: profileExtra.referralOther || null,
      institutionName: affiliation.institutionName ?? profileExtra.institutionName ?? null,
      ...affiliation,
      ...(mitraCapacity || {}),
      inviteStatus: latestMitraInvite ? this.resolveInviteStatus(latestMitraInvite) : null,
      inviteExpiresAt: latestMitraInvite?.expiresAt || null,
      inviteClaimedAt: latestMitraInvite?.claimedAt || null,
      ...stats,
      publicId: user.myReferralCode || null,
      businessId: user.myReferralCode || null,
      memberCode: user.myReferralCode || null,
      adminRoleId: adminAccess?.adminRole?.id || user.adminRoleId || null,
      adminRole: adminAccess?.adminRole || null,
      permissionKeys: adminAccess?.permissionKeys || [],
      isProtectedAdminRole: adminAccess?.isProtectedAdminRole || false,
    });
  }

  private async buildAffiliationContext(user: any, profileExtra: Record<string, any> = {}) {
    const referralMeta =
      profileExtra.referralMeta && typeof profileExtra.referralMeta === 'object'
        ? (profileExtra.referralMeta as Record<string, any>)
        : null;
    const result: Record<string, any> = {
      referralMeta,
      referralOwnerRole: profileExtra.referralOwnerRole ?? referralMeta?.referrerRole ?? null,
      affiliationType: profileExtra.affiliationType ?? null,
      isYayasanLinked: profileExtra.isYayasanLinked ?? false,
    };

    if (user?.role === Role.YAYASAN) {
      const mitra =
        (await this.findMitraByCode(user?.referredByCode)) ||
        (await this.findMitraByCode(referralMeta?.parentMitraCode)) ||
        null;

      result.approvalStatus = user?.yayasanProfile?.approvalStatus ?? YayasanApprovalStatus.PENDING_MITRA_APPROVAL;
      result.isMitraApproved = result.approvalStatus === YayasanApprovalStatus.APPROVED;
      result.referralActive = result.isMitraApproved && (user?.yayasanProfile?.isActive ?? true);
      result.approvedAt = user?.yayasanProfile?.approvedAt ?? null;
      result.approvedByMitraId = user?.yayasanProfile?.approvedByMitraId ?? null;
      result.approvalLockedAt = user?.yayasanProfile?.approvalLockedAt ?? null;
      result.yayasanShare = result.isMitraApproved ? user?.yayasanProfile?.referralPrice ?? 0 : 0;
      result.mitraShare = result.isMitraApproved ? user?.yayasanProfile?.mitraShare ?? 0 : 0;
      result.referralPrice = result.yayasanShare;
      result.totalPrice = result.isMitraApproved ? 250000 : 0;

      if (mitra) {
        result.affiliationType = 'mitra';
        result.mitraId = mitra.id;
        result.mitraName = mitra.fullName || null;
        result.mitraEmail = mitra.email || null;
        result.mitraInviteCode = mitra.mitraProfile?.inviteCode || mitra.myReferralCode || null;
      }

      return result;
    }

    if (user?.role !== Role.USER) {
      return result;
    }

    const yayasanCode =
      profileExtra.yayasanReferralCode ||
      referralMeta?.yayasanCode ||
      (referralMeta?.referrerRole === Role.YAYASAN ? referralMeta?.referrerCode : null) ||
      null;
    const yayasan =
      (await this.findYayasanByCode(yayasanCode)) ||
      (referralMeta?.referrerRole === Role.YAYASAN ? await this.findYayasanByCode(user?.referredByCode) : null) ||
      null;

    if (!yayasan) {
      return result;
    }

    result.affiliationType = 'yayasan';
    result.isYayasanLinked = true;
    result.userType = 'institution';
    result.yayasanId = yayasan.id;
    result.yayasanName = yayasan.yayasanProfile?.institutionName || yayasan.fullName || null;
    result.yayasanEmail = yayasan.email || null;
    result.yayasanReferralCode = yayasan.myReferralCode || null;
    result.institutionName = profileExtra.institutionName || result.yayasanName;

    const mitra =
      (await this.findMitraByCode(profileExtra.mitraInviteCode || referralMeta?.parentMitraCode || yayasan.referredByCode)) ||
      null;
    if (mitra) {
      result.mitraId = mitra.id;
      result.mitraName = mitra.fullName || null;
      result.mitraEmail = mitra.email || null;
      result.mitraInviteCode = mitra.mitraProfile?.inviteCode || mitra.myReferralCode || null;
    }

    return result;
  }

  async register(
    body: RegisterDto & Record<string, any>,
    role: Role,
    _adminShape = false,
    auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const targetRole = role === Role.ADMIN ? this.resolveManagedAdminRole(body.role) : role;
    if (targetRole === Role.MITRA) {
      throw new BadRequestException('Akun mitra dibuat oleh admin. Silakan hubungi admin NEWME untuk proses pembuatan akun.');
    }
    const email = this.normalizeEmail(body.email);
    const username = this.normalizeUsername(body.username);
    const phone = this.normalizePhone(body.phone || body.whatsapp);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: { username },
        select: { id: true },
      });
      if (existingUsername) {
        throw new ConflictException('Username already registered');
      }
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findFirst({ where: { phone } });
      if (existingPhone) {
        throw new ConflictException('Phone or WhatsApp already registered');
      }
    }

    const referralInput = body.referralCode || body.ref || body.mitra || null;
    const referral = await this.resolveReferralContext(targetRole, referralInput);
    if (targetRole === Role.YAYASAN && referral.referrer?.role === Role.MITRA) {
      await this.assertMitraHasCapacity(
        referral.referrer.id,
        referral.referrer.mitraProfile?.inviteCode || referral.referrer.myReferralCode || referral.referredByCode,
      );
    }
    const publicCode = await this.generateUniqueBusinessCode(targetRole);
    const birthDate = this.parseBirthDate(body.birthDate);
    const institutionName =
      targetRole === Role.YAYASAN ? body.institutionName || body.fullName || body.name || 'Yayasan' : undefined;

    const user = await this.prisma.user.create({
      data: {
        email,
        username: username || null,
        fullName: body.fullName || body.name || 'User',
        passwordHash: this.hashValue(body.password || 'ChangeMe123!'),
        phone,
        role: targetRole,
        status:
          targetRole === Role.USER || this.isAdminPanelRole(targetRole) || targetRole === Role.YAYASAN
            ? AccountStatus.ACTIVE
            : AccountStatus.PENDING_VERIFICATION,
        myReferralCode: publicCode,
        referredByCode: referral.referredByCode,
        wallet: { create: { availableBalance: 0, reserveBalance: 0 } },
        profile: {
          create: {
            birthDate,
            province: body.province || null,
            city: body.city || null,
            district: body.district || null,
            village: body.village || null,
              extra: {
                address: body.address || null,
                userType: body.userType || null,
                referralSource: body.referralSource || null,
                referralOther: body.referralOther || null,
                institutionName: body.institutionName || null,
                institutionAddress: body.institutionAddress || null,
                position: body.position || null,
                description: body.description || null,
                publicCode,
                ...referral.profileExtra,
            },
          },
        },
        yayasanProfile:
          targetRole === Role.YAYASAN
            ? {
                create: {
                  institutionName: institutionName!,
                  referralPrice: 0,
                  mitraShare: 0,
                  managedByMitraId: targetRole === Role.YAYASAN && referral.referrer?.role === Role.MITRA
                    ? referral.referrer.id
                    : null,
                  approvalStatus: YayasanApprovalStatus.PENDING_MITRA_APPROVAL,
                },
              }
            : undefined,
        mitraProfile: undefined,
      },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    const session = await this.createAuthSession(user, auditMeta);
    const token = this.createAccessToken(user, session.id);
    const mappedUser = await this.mapUserWithComputedStats(user);

    return {
      success: true,
      token,
      access_token: token,
      session: this.buildSessionMetadata(user, session),
      user: mappedUser,
      admin: this.isAdminPanelRole(targetRole) ? mappedUser : undefined,
      yayasan: targetRole === Role.YAYASAN ? mappedUser : undefined,
      mitra: undefined,
      message: 'Registrasi berhasil',
    };
  }

  async login(
    body: LoginDto,
    role: Role,
    adminShape = false,
    auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const email = this.normalizeEmail(body.email);
    if (role === Role.ADMIN) {
      await this.assertAdminLoginNotLocked(email, auditMeta.ipAddress || null);
    }
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });
    const roleAllowed =
      role === Role.ADMIN
        ? this.isAdminPanelRole(user?.role)
        : user?.role === role;
    if (!user || !roleAllowed) {
      if (role === Role.ADMIN) {
        await this.createAuditLog({
          action: 'ADMIN_LOGIN_FAILED',
          targetType: 'auth',
          payload: { email, reason: 'invalid_role_or_user' },
          ipAddress: auditMeta.ipAddress || null,
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const passHash = this.hashValue(body.password || '');
    if (passHash !== user.passwordHash) {
      if (role === Role.ADMIN) {
        await this.createAuditLog({
          actorUserId: user.id,
          action: 'ADMIN_LOGIN_FAILED',
          targetType: 'auth',
          targetId: user.id,
          payload: { email, reason: 'invalid_password' },
          ipAddress: auditMeta.ipAddress || null,
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (role === Role.MITRA) {
      if (user.status === AccountStatus.PENDING_VERIFICATION) {
        throw new UnauthorizedException('Akun mitra Anda belum aktif. Silakan buka link undangan dari admin NEWME terlebih dahulu.');
      }
    }

    const session = await this.createAuthSession(user, auditMeta);
    const token = this.createAccessToken(user, session.id);
    const mappedUser = await this.mapUserWithComputedStats(user);

    if (role === Role.ADMIN) {
      await this.createAuditLog({
        actorUserId: user.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        targetType: 'auth',
        targetId: user.id,
        payload: { email },
        ipAddress: auditMeta.ipAddress || null,
      });
    }

    if (adminShape) {
      return {
        success: true,
        token,
        access_token: token,
        session: this.buildSessionMetadata(user, session),
        user: mappedUser,
      admin: mappedUser,
      };
    }

    return {
      success: true,
      token,
      access_token: token,
      session: this.buildSessionMetadata(user, session),
      user: mappedUser,
      yayasan: role === Role.YAYASAN ? mappedUser : undefined,
      mitra: role === Role.MITRA ? mappedUser : undefined,
    };
  }

  async loginAdmin(
    body: { username?: string; email?: string; password?: string },
    auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const rawIdentifier = String(body.username || body.email || '').trim();
    const login = this.normalizeAdminLoginIdentifier(rawIdentifier);
    if (!login) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.adminRbacService.ensureAdminRbacReady();
    await this.assertAdminLoginNotLocked(login, auditMeta.ipAddress || null);

    const normalizedUsername = rawIdentifier.includes('@') ? '' : this.normalizeUsername(rawIdentifier);
    const normalizedEmail = rawIdentifier.includes('@') ? this.normalizeEmail(rawIdentifier) : '';
    const user = await this.prisma.user.findFirst({
      where: {
        role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR, Role.DEVELOPER] },
        OR: [
          ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    if (!user || !this.isAdminPanelRole(user.role)) {
      await this.createAuditLog({
        action: 'ADMIN_LOGIN_FAILED',
        targetType: 'auth',
        payload: { login, reason: 'invalid_role_or_user' },
        ipAddress: auditMeta.ipAddress || null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passHash = this.hashValue(body.password || '');
    if (passHash !== user.passwordHash) {
      await this.createAuditLog({
        actorUserId: user.id,
        action: 'ADMIN_LOGIN_FAILED',
        targetType: 'auth',
        targetId: user.id,
        payload: {
          login,
          email: user.email,
          username: user.username,
          reason: 'invalid_password',
        },
        ipAddress: auditMeta.ipAddress || null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.createAuthSession(user, auditMeta);
    const token = this.createAccessToken(user, session.id);
    const mappedUser = await this.mapUserWithComputedStats(user);

    await this.createAuditLog({
      actorUserId: user.id,
      action: 'ADMIN_LOGIN_SUCCESS',
      targetType: 'auth',
      targetId: user.id,
      payload: {
        login,
        email: user.email,
        username: user.username,
      },
      ipAddress: auditMeta.ipAddress || null,
    });

    return {
      success: true,
      token,
      access_token: token,
      session: this.buildSessionMetadata(user, session),
      user: mappedUser,
      admin: mappedUser,
    };
  }

  async getProfile(userId: string, sessionId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    const mappedUser = await this.mapUserWithComputedStats(user);
    if (!user) return mappedUser;

    let sessionMeta: SessionMetadata | null = null;
    if (sessionId) {
      const session = await this.getValidSessionOrThrow(userId, sessionId);
      sessionMeta = this.buildSessionMetadata(user, session);
    }

    return {
      ...mappedUser,
      session: sessionMeta,
    };
  }

  async refreshSession(userId: string, sessionId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const existingSession = await this.getValidSessionOrThrow(userId, sessionId);
    const session = await this.extendSession(existingSession.id, user.role);
    const token = this.createAccessToken(user, session.id);
    return {
      success: true,
      token,
      access_token: token,
      session: this.buildSessionMetadata(user, session),
    };
  }

  async updateProfile(userId: string, body: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, yayasanProfile: true },
    });
    if (!existing) {
      throw new UnauthorizedException('Invalid user');
    }

    const nextEmail = body.email ? this.normalizeEmail(body.email) : existing.email;
    const nextPhone = body.phone !== undefined ? this.normalizePhone(body.phone) : existing.phone;
    const nextFullName = body.fullName || existing.fullName;
    const birthDate = this.parseBirthDate(body.birthDate);

    if (nextEmail !== existing.email) {
      const emailUsed = await this.prisma.user.findFirst({
        where: { email: nextEmail, id: { not: userId } },
        select: { id: true },
      });
      if (emailUsed) {
        throw new ConflictException('Email already registered');
      }
    }

    if (nextPhone && nextPhone !== existing.phone) {
      const phoneUsed = await this.prisma.user.findFirst({
        where: { phone: nextPhone, id: { not: userId } },
        select: { id: true },
      });
      if (phoneUsed) {
        throw new ConflictException('Phone or WhatsApp already registered');
      }
    }

    const existingExtra =
      existing.profile?.extra && typeof existing.profile.extra === 'object'
        ? (existing.profile.extra as Record<string, any>)
        : {};

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: nextFullName,
        email: nextEmail,
        phone: nextPhone,
        profile: {
          upsert: {
            create: {
              birthDate,
              province: body.province,
              city: body.city,
              district: body.district,
              village: body.village,
              extra: {
                ...existingExtra,
                address: body.address ?? existingExtra.address ?? null,
                institutionName: body.institutionName ?? existingExtra.institutionName ?? null,
                institutionAddress: body.institutionAddress ?? existingExtra.institutionAddress ?? null,
                description: body.description ?? existingExtra.description ?? null,
                userType: existingExtra.userType ?? null,
              },
            },
            update: {
              birthDate,
              province: body.province,
              city: body.city,
              district: body.district,
              village: body.village,
              extra: {
                ...existingExtra,
                address: body.address ?? existingExtra.address ?? null,
                institutionName: body.institutionName ?? existingExtra.institutionName ?? null,
                institutionAddress: body.institutionAddress ?? existingExtra.institutionAddress ?? null,
                description: body.description ?? existingExtra.description ?? null,
                userType: existingExtra.userType ?? null,
              },
            },
          },
        },
        yayasanProfile:
          existing.role === Role.YAYASAN
            ? {
                upsert: {
                  create: {
                    institutionName: body.institutionName || nextFullName || 'Yayasan',
                    referralPrice: existing.yayasanProfile?.referralPrice ?? 0,
                    mitraShare: existing.yayasanProfile?.mitraShare ?? 0,
                    approvalStatus:
                      existing.yayasanProfile?.approvalStatus ?? YayasanApprovalStatus.PENDING_MITRA_APPROVAL,
                  },
                  update: {
                    institutionName: body.institutionName || nextFullName || existing.yayasanProfile?.institutionName || 'Yayasan',
                  },
                },
              }
            : undefined,
      },
    });

    return this.getProfile(userId);
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: this.hashValue(body.newPassword || body.password || 'ChangeMe123!') },
    });

    return { message: 'Password updated' };
  }

  rejectPublicMitraRegistration() {
    throw new BadRequestException('Akun mitra dibuat oleh admin NEWME. Silakan hubungi admin untuk proses pembuatan akun.');
  }

  async validateMitraInvite(rawToken?: string | null) {
    const token = String(rawToken || '').trim();
    if (!token) {
      throw new BadRequestException('Token invite mitra tidak ditemukan.');
    }

    const invite = await this.prisma.mitraInvite.findUnique({
      where: { tokenHash: this.hashValue(token) },
      include: {
        user: {
          include: {
            profile: true,
            mitraProfile: true,
          },
        },
      },
    });

    if (!invite) {
      throw new BadRequestException('Link undangan mitra tidak valid atau sudah tidak tersedia.');
    }

    const resolvedStatus = this.resolveInviteStatus(invite);
    if (resolvedStatus !== invite.status) {
      await this.prisma.mitraInvite.update({
        where: { id: invite.id },
        data: { status: resolvedStatus as MitraInviteStatus },
      });
    }

    if (resolvedStatus !== MitraInviteStatus.PENDING) {
      throw new BadRequestException('Link undangan mitra sudah tidak aktif. Minta admin NEWME mengirimkan undangan baru.');
    }

    const profileExtra =
      invite.user?.profile?.extra && typeof invite.user.profile.extra === 'object'
        ? (invite.user.profile.extra as Record<string, any>)
        : {};

    return {
      valid: true,
      invite: this.buildMitraInviteResponse(invite),
      mitra: {
        id: invite.user.id,
        fullName: invite.user.fullName,
        email: this.isMitraPlaceholderEmail(invite.user.email) ? null : invite.user.email,
        phone: invite.user.phone || null,
        address: profileExtra.address || null,
        description: profileExtra.description || null,
      },
    };
  }

  async claimMitraInvite(
    body: ClaimMitraInviteDto,
    auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const token = String(body.token || '').trim();
    if (!token) {
      throw new BadRequestException('Token invite mitra tidak ditemukan.');
    }

    const tokenHash = this.hashValue(token);
    const invite = await this.prisma.mitraInvite.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            profile: true,
            wallet: true,
            mitraProfile: true,
          },
        },
        mitraProfile: true,
      },
    });

    if (!invite) {
      throw new BadRequestException('Link undangan mitra tidak valid atau sudah tidak tersedia.');
    }

    const resolvedStatus = this.resolveInviteStatus(invite);
    if (resolvedStatus !== MitraInviteStatus.PENDING) {
      if (resolvedStatus !== invite.status) {
        await this.prisma.mitraInvite.update({
          where: { id: invite.id },
          data: { status: resolvedStatus as MitraInviteStatus },
        });
      }
      throw new BadRequestException('Link undangan mitra sudah tidak aktif. Minta admin NEWME mengirimkan undangan baru.');
    }

    const email = this.normalizeEmail(body.email);
    const phone = body.phone !== undefined ? this.normalizePhone(body.phone) : invite.user.phone;
    const fullName = String(body.fullName || '').trim();
    if (!fullName) {
      throw new BadRequestException('Nama mitra wajib diisi.');
    }

    const emailUsed = await this.prisma.user.findFirst({
      where: { email, id: { not: invite.userId } },
      select: { id: true },
    });
    if (emailUsed) {
      throw new ConflictException('Email already registered');
    }

    if (phone) {
      const phoneUsed = await this.prisma.user.findFirst({
        where: { phone, id: { not: invite.userId } },
        select: { id: true },
      });
      if (phoneUsed) {
        throw new ConflictException('Phone or WhatsApp already registered');
      }
    }

    const birthDate = body.birthDate !== undefined
      ? this.parseBirthDate(body.birthDate)
      : invite.user.profile?.birthDate || null;
    const existingExtra =
      invite.user.profile?.extra && typeof invite.user.profile.extra === 'object'
        ? (invite.user.profile.extra as Record<string, any>)
        : {};

    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: invite.userId },
        data: {
          fullName,
          email,
          phone: phone || null,
          passwordHash: this.hashValue(body.password || 'ChangeMe123!'),
          status: AccountStatus.ACTIVE,
          profile: {
            upsert: {
              create: {
                birthDate,
                extra: {
                  ...existingExtra,
                  address: body.address ?? existingExtra.address ?? null,
                  description: body.description ?? existingExtra.description ?? null,
                },
              },
              update: {
                birthDate,
                extra: {
                  ...existingExtra,
                  address: body.address ?? existingExtra.address ?? null,
                  description: body.description ?? existingExtra.description ?? null,
                },
              },
            },
          },
          mitraProfile: {
            update: {
              isVerified: true,
              isActive: true,
              capacityLimit: invite.user.mitraProfile?.capacityLimit || 35,
              capacityUpdatedAt: invite.user.mitraProfile?.capacityUpdatedAt || new Date(),
            },
          },
        },
        include: {
          profile: true,
          wallet: true,
          yayasanProfile: true,
          mitraProfile: true,
        },
      });

      await tx.mitraInvite.update({
        where: { id: invite.id },
        data: {
          status: MitraInviteStatus.CLAIMED,
          claimedAt: new Date(),
        },
      });

      await tx.mitraInvite.updateMany({
        where: {
          userId: invite.userId,
          id: { not: invite.id },
          status: MitraInviteStatus.PENDING,
        },
        data: {
          status: MitraInviteStatus.REVOKED,
          revokedAt: new Date(),
        },
      });

      return updatedUser;
    });

    const session = await this.createAuthSession(user, auditMeta);
    const mappedUser = await this.mapUserWithComputedStats(user);
    const accessToken = this.createAccessToken(user, session.id);

    return {
      success: true,
      token: accessToken,
      access_token: accessToken,
      session: this.buildSessionMetadata(user, session),
      user: mappedUser,
      mitra: mappedUser,
      message: 'Akun mitra berhasil diaktifkan.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
    if (!user) {
      return { message: 'Jika email terdaftar, link reset telah dikirim.' };
    }

    const token = randomBytes(24).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashValue(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    return { message: 'Reset token generated', token };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashValue(token || '');
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: this.hashValue(password || 'ChangeMe123!') },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset success' };
  }

  async getReferralLink(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      referralCode: user?.myReferralCode,
      referralLink: `${this.getFrontendBaseUrl()}/register?ref=${user?.myReferralCode || ''}`,
    };
  }

  async getAdminUsers(query: { page?: string | number; pageSize?: string | number; search?: string } = {}) {
    await this.adminRbacService.ensureAdminRbacReady();

    const { page, pageSize, skip, take } = resolvePagination(query, { pageSize: 10, maxPageSize: 100 });
    const normalizedSearch = String(query.search || '').trim();
    const where: any = {
      role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR] },
    };
    if (normalizedSearch) {
      where.OR = [
        { fullName: { contains: normalizedSearch } },
        { email: { contains: normalizedSearch } },
        { username: { contains: normalizedSearch } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
      }),
    ]);

    const items = await Promise.all(rows.map((row) => this.mapUserWithComputedStats(row)));
    return buildPaginatedResult(items, total, page, pageSize);
  }

  async getAdminDashboardStats(viewerRole?: Role) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const [userCounts, totalPayments, paymentStatusGroups, revenueTotals, monthlyRevenue, registrationTotal, registrationRecent, contactTotal, contactRecent, recentUsers, recentPayments, recentRevenueRows, openPaymentAlerts, pendingDisbursements] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prisma.paymentOrder.count(),
      this.prisma.paymentOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.revenueLedger.aggregate({
        _sum: {
          amount: true,
          newmeShare: true,
          mitraShare: true,
          yayasanShare: true,
        },
      }),
      this.prisma.revenueLedger.aggregate({
        where: { createdAt: { gte: firstDayOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.registrationLead.count(),
      this.prisma.registrationLead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          email: true,
          source: true,
          createdAt: true,
        },
      }),
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          message: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: { role: Role.USER },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          fullName: true,
          email: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      this.prisma.paymentOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          orderId: true,
          amount: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.revenueLedger.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        orderBy: { createdAt: 'asc' },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
      this.prisma.paymentOpsAlert.count({
        where: {
          status: { in: [PaymentOpsAlertStatus.OPEN, PaymentOpsAlertStatus.ACKNOWLEDGED] },
        },
      }),
      this.prisma.disbursement.count({
        where: {
          status: { in: [DisbursementStatus.PENDING, DisbursementStatus.PROCESSING] },
        },
      }),
    ]);

    const countByRole = Object.fromEntries(
      userCounts.map((item) => [item.role, Number(item._count._all || 0)]),
    ) as Record<string, number>;
    const totalUsers = countByRole[Role.USER] || 0;
    const totalMitra = countByRole[Role.MITRA] || 0;
    const totalYayasan = countByRole[Role.YAYASAN] || 0;
    const successfulPaymentStatuses = new Set<PaymentStatus>([
      PaymentStatus.SUCCESS,
      PaymentStatus.SETTLEMENT,
      PaymentStatus.CAPTURE,
    ]);
    const successfulPayments = paymentStatusGroups
      .filter((item) => successfulPaymentStatuses.has(item.status))
      .reduce((sum, item) => sum + Number(item._count._all || 0), 0);
    const pendingPayments = paymentStatusGroups
      .filter((item) => item.status === PaymentStatus.PENDING || item.status === PaymentStatus.CREATED)
      .reduce((sum, item) => sum + Number(item._count._all || 0), 0);

    const paymentStatusDistribution = paymentStatusGroups
      .map((item) => ({
        key: item.status,
        count: Number(item._count._all || 0),
      }))
      .filter((item) => item.count > 0);

    const roleDistribution = [
      { key: 'USER', label: 'User', count: totalUsers },
      { key: 'MITRA', label: 'Mitra', count: totalMitra },
      { key: 'YAYASAN', label: 'Yayasan', count: totalYayasan },
      { key: 'ADMIN', label: 'Admin', count: (countByRole[Role.ADMIN] || 0) + (countByRole[Role.SUPERADMIN] || 0) + (countByRole[Role.OPERATOR] || 0) },
    ].filter((item) => item.count > 0);

    const monthBuckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        users: 0,
        revenue: 0,
      };
    });
    const monthBucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

    const userTrendRows = await this.prisma.user.findMany({
      where: {
        role: Role.USER,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    userTrendRows.forEach((row) => {
      const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthBucketMap.get(key);
      if (bucket) bucket.users += 1;
    });

    recentRevenueRows.forEach((row) => {
      const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthBucketMap.get(key);
      if (bucket) bucket.revenue += Number(row.amount || 0);
    });

    const payload = {
      totalUsers,
      totalPayments,
      pendingPayments,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      summary: {
        totalUsers,
        totalMitra,
        totalYayasan,
        totalPayments,
        successfulPayments,
        pendingPayments,
        totalRevenue: Number(revenueTotals._sum.amount || 0),
        newmeRevenue: Number(revenueTotals._sum.newmeShare || 0),
        mitraRevenue: Number(revenueTotals._sum.mitraShare || 0),
        yayasanRevenue: Number(revenueTotals._sum.yayasanShare || 0),
        openPaymentAlerts,
        pendingDisbursements,
      },
      charts: {
        userGrowth: monthBuckets.map((item) => ({ label: item.label, value: item.users })),
        revenueTrend: monthBuckets.map((item) => ({ label: item.label, value: item.revenue })),
        roleDistribution,
        paymentStatusDistribution,
      },
      recent: {
        users: recentUsers.map((item) => ({
          id: item.id,
          name: item.fullName,
          email: item.email,
          paymentStatus: item.paymentStatus,
          createdAt: item.createdAt,
        })),
        payments: recentPayments.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          amount: item.amount,
          status: item.status,
          createdAt: item.createdAt,
          user: item.user?.fullName || 'Pengguna',
          email: item.user?.email || null,
        })),
      },
      registrations: {
        total: registrationTotal,
        recent: registrationRecent.map((item) => ({
          _id: item.id,
          name: item.fullName,
          email: item.email,
          testStatus: item.source || 'new',
          createdAt: item.createdAt,
        })),
      },
      contacts: {
        total: contactTotal,
        recent: contactRecent.map((item) => ({
          _id: item.id,
          name: item.name,
          email: item.email,
          message: item.message,
          status: item.status,
          createdAt: item.createdAt,
        })),
      },
    };

    if (viewerRole === Role.OPERATOR) {
      return {
        ...payload,
        summary: {
          ...payload.summary,
          totalRevenue: null,
          newmeRevenue: null,
          mitraRevenue: null,
          yayasanRevenue: null,
          openPaymentAlerts: null,
          pendingDisbursements: null,
        },
        charts: {
          ...payload.charts,
          revenueTrend: [],
          paymentStatusDistribution: [],
        },
        recent: {
          ...payload.recent,
          payments: [],
        },
      };
    }

    return payload;
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Admin deleted' };
  }
}
