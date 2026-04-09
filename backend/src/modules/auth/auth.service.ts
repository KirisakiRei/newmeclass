import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, AuthAudience, AuthProvider, DisbursementStatus, MitraInviteStatus, PaymentOpsAlertStatus, PaymentStatus, Role, YayasanApprovalStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import axios from 'axios';
import { createHash, randomBytes, randomInt } from 'crypto';
import { hashLocalPassword, verifyLocalPassword } from 'src/common/auth/password.utils';
import {
  getAccessTokenExpiresIn as resolveAccessTokenExpiresIn,
  getAccessTokenTtlMs as resolveAccessTokenTtlMs,
  getRefreshTokenTtlMs as resolveRefreshTokenTtlMs,
  getSessionIdleTimeoutMs as resolveSessionIdleTimeoutMs,
  getSessionWarningThresholdMs as resolveSessionWarningThresholdMs,
} from 'src/common/auth/auth-session.config';
import { buildDashboardFrontendUrl, buildPublicFrontendUrl, getDashboardFrontendBaseUrl, getPublicFrontendBaseUrl } from 'src/common/frontend-urls';
import { resolveAudienceFromRole } from 'src/common/auth/auth-cookie.utils';
import { mapUserForClient } from 'src/common/mappers/client-shapes';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { DEVELOPER_ROOT_ROLE_SLUG } from '../admin-rbac/admin-permission-catalog';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminRbacService } from '../admin-rbac/admin-rbac.service';
import { MailService } from '../mail/mail.service';
import { buildPasswordResetEmailTemplate } from '../mail/templates/password-reset.template';
import { buildRegisterOtpEmailTemplate } from '../mail/templates/register-otp.template';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ClaimMitraInviteDto } from './dto/claim-mitra-invite.dto';
import { CompleteGoogleProfileDto } from './dto/complete-google-profile.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const ADMIN_LOGIN_LOCK_THRESHOLD = Number(process.env.ADMIN_LOGIN_LOCK_THRESHOLD || 3);
const ADMIN_LOGIN_LOCK_WINDOW_MS = Number(process.env.ADMIN_LOGIN_LOCK_WINDOW_MINUTES || 15) * 60 * 1000;
const MITRA_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MITRA_PLACEHOLDER_EMAIL_DOMAIN = 'pending-mitra.newme.local';
const BRIDGE_TICKET_TTL_MS = Number(process.env.AUTH_BRIDGE_TICKET_TTL_SECONDS || 120) * 1000;
const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const REGISTER_OTP_TTL_MS = Number(process.env.AUTH_REGISTER_OTP_TTL_MINUTES || 10) * 60 * 1000;
const REGISTER_OTP_MAX_ATTEMPTS = Number(process.env.AUTH_REGISTER_OTP_MAX_ATTEMPTS || 5);
const REGISTER_OTP_RESEND_COOLDOWN_MS = Number(process.env.AUTH_REGISTER_RESEND_COOLDOWN_SECONDS || 60) * 1000;

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
  audience?: AuthAudience;
  idleTimeoutMs: number;
  warningThresholdMs: number;
  expiresAt: Date;
  serverTime: Date;
};

type SessionViewer = {
  id: string;
  role: Role;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  authProvider: string;
  onboardingCompleted: boolean;
  permissionKeys: string[];
};

type AuthCookiePayload = {
  audience: AuthAudience;
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
  csrfToken: string;
};

type GoogleOauthContext = {
  intent: 'login' | 'register';
  target: string;
  referralCode?: string | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly adminRbacService: AdminRbacService,
    private readonly mailService: MailService,
    private readonly adminActivityLogService: AdminActivityLogService,
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
    return resolveSessionIdleTimeoutMs(role);
  }

  private getWarningThresholdMs(role: Role) {
    return resolveSessionWarningThresholdMs(role);
  }

  private getAccessTokenExpiresIn(role: Role) {
    return resolveAccessTokenExpiresIn(role);
  }

  private getAccessTokenTtlMs(role: Role) {
    return resolveAccessTokenTtlMs(role);
  }

  private getRefreshTokenTtlMs() {
    return resolveRefreshTokenTtlMs();
  }

  private normalizeBridgeTarget(target?: string | null) {
    const value = String(target || '').trim() || '/dashboard';
    if (!value.startsWith('/')) {
      throw new BadRequestException('Bridge target must start with "/"');
    }
    if (value.startsWith('//')) {
      throw new BadRequestException('Bridge target is invalid');
    }

    const allowedExactTargets = new Set(['/dashboard', '/user-test', '/wallet']);
    const allowedPrefixes = ['/test-result/'];

    if (allowedExactTargets.has(value)) {
      return value;
    }

    if (allowedPrefixes.some((prefix) => value.startsWith(prefix))) {
      return value;
    }

    throw new BadRequestException('Bridge target is not allowed');
  }

  private createAccessToken(user: { id: string; role: Role; email: string }, sessionId: string, audience: AuthAudience) {
    return this.jwtService.sign(
      { sub: user.id, role: user.role, email: user.email, sid: sessionId, aud: audience },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: this.getAccessTokenExpiresIn(user.role),
      },
    );
  }

  private buildSessionMetadata(user: { role: Role }, session: { id: string; expiresAt: Date; audience?: AuthAudience | null }): SessionMetadata {
    return {
      id: session.id,
      audience: session.audience || undefined,
      idleTimeoutMs: this.getIdleTimeoutMs(user.role),
      warningThresholdMs: this.getWarningThresholdMs(user.role),
      expiresAt: session.expiresAt,
      serverTime: new Date(),
    };
  }

  private buildSessionViewer(mappedUser: any): SessionViewer | null {
    if (!mappedUser) return null;

    return {
      id: mappedUser.id,
      role: mappedUser.role,
      displayName: mappedUser.fullName || mappedUser.name || mappedUser.username || mappedUser.email || 'User',
      email: mappedUser.email || null,
      avatarUrl: mappedUser.avatarUrl || null,
      authProvider: mappedUser.authProvider || AuthProvider.LOCAL,
      onboardingCompleted: Boolean(mappedUser.onboardingCompleted),
      permissionKeys: Array.isArray(mappedUser.permissionKeys) ? mappedUser.permissionKeys : [],
    };
  }

  private async createAuthSessionWithClient(
    client: any,
    user: { id: string; role: Role },
    meta: { ipAddress?: string | null; userAgent?: string | null } = {},
    audience = resolveAudienceFromRole(user.role),
  ) {
    const expiresAt = new Date(Date.now() + this.getIdleTimeoutMs(user.role));
    const absoluteExpiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashValue(refreshToken);
    const session = await client.authSession.create({
      data: {
        userId: user.id,
        audience,
        refreshTokenHash,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        lastActivityAt: new Date(),
        absoluteExpiresAt,
        expiresAt,
      },
    });
    return { session, refreshToken };
  }

  private async createAuthSession(
    user: { id: string; role: Role },
    meta: { ipAddress?: string | null; userAgent?: string | null } = {},
    audience = resolveAudienceFromRole(user.role),
  ) {
    return this.createAuthSessionWithClient(this.prisma, user, meta, audience);
  }

  private async getValidSessionOrThrow(userId: string, sessionId?: string | null, audience?: AuthAudience | null) {
    const normalizedSessionId = String(sessionId || '').trim();
    if (!normalizedSessionId) {
      throw new UnauthorizedException('Invalid session');
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        id: normalizedSessionId,
        userId,
        revokedAt: null,
        ...(audience ? { audience } : {}),
      },
    });

    if (!session || session.expiresAt.getTime() <= Date.now() || session.absoluteExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired');
    }

    return session;
  }

  private async extendSession(sessionId: string, role: Role, refreshToken: string) {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: this.hashValue(refreshToken),
        expiresAt: new Date(Date.now() + this.getIdleTimeoutMs(role)),
        lastActivityAt: new Date(),
        revokedAt: null,
      },
    });
  }

  private async revokeUserSessions(userId: string, excludeSessionId?: string | null) {
    return this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async hashPassword(value: string) {
    return hashLocalPassword(value);
  }

  private async verifyPassword(password: string, passwordHash?: string | null) {
    return verifyLocalPassword(password, passwordHash);
  }

  logLegacyRegistrationUsage(
    role: Role,
    body: Record<string, any> = {},
    meta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const email = this.normalizeEmail(String(body.email || ''));
    const referralCode = String(body.referralCode || body.ref || body.mitra || '').trim() || null;
    this.logger.warn(JSON.stringify({
      event: 'LEGACY_PUBLIC_REGISTER_USED',
      role,
      email: email ? this.maskEmail(email) : null,
      referralCode,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    }));
  }

  private generateOtpCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private randomCode(prefix: string): string {
    return `${prefix}${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private normalizeEmail(email: string) {
    return String(email || '').trim().toLowerCase();
  }

  private maskEmail(email?: string | null) {
    const normalized = this.normalizeEmail(String(email || ''));
    const [localPart, domain] = normalized.split('@');
    if (!localPart || !domain) {
      return 'unknown-recipient';
    }

    const visibleLocal = localPart.length <= 2
      ? `${localPart[0] || '*'}*`
      : `${localPart.slice(0, 2)}***`;

    return `${visibleLocal}@${domain}`;
  }

  private safeObject(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private normalizeGoogleIntent(value?: string | null): 'login' | 'register' {
    return String(value || '').trim().toLowerCase() === 'register' ? 'register' : 'login';
  }

  private buildProviderMismatchError(provider: AuthProvider) {
    if (provider === AuthProvider.GOOGLE) {
      throw new UnauthorizedException('AUTH_PROVIDER_MISMATCH_GOOGLE_ONLY');
    }
    throw new UnauthorizedException('AUTH_PROVIDER_MISMATCH_MANUAL_ONLY');
  }

  private assertGoogleIdentityAllowed(user: any) {
    if (!user) return;
    if (user.primaryAuthProvider && user.primaryAuthProvider !== AuthProvider.GOOGLE) {
      throw new ConflictException('AUTH_PROVIDER_MISMATCH_MANUAL_ONLY');
    }
  }

  private encodeGoogleOauthContext(context: GoogleOauthContext) {
    return Buffer.from(JSON.stringify(context), 'utf-8').toString('base64url');
  }

  decodeGoogleOauthContext(value?: string | null): GoogleOauthContext {
    try {
      const raw = Buffer.from(String(value || ''), 'base64url').toString('utf-8');
      const parsed = JSON.parse(raw);
      return {
        intent: this.normalizeGoogleIntent(parsed?.intent),
        target: this.normalizeBridgeTarget(parsed?.target),
        referralCode: String(parsed?.referralCode || '').trim() || null,
      };
    } catch {
      throw new UnauthorizedException('AUTH_OAUTH_STATE_INVALID');
    }
  }

  buildGoogleOauthStartUrl(input: { intent?: string | null; target?: string | null; referralCode?: string | null }) {
    this.assertGoogleOauthEnabled();
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const callbackUrl = String(process.env.GOOGLE_CALLBACK_URL || '').trim();
    if (!clientId || !callbackUrl) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    const state = randomBytes(32).toString('hex');
    const nonce = randomBytes(24).toString('hex');
    const context: GoogleOauthContext = {
      intent: this.normalizeGoogleIntent(input.intent),
      target: this.normalizeBridgeTarget(input.target),
      referralCode: this.normalizeReferralCode(input.referralCode),
    };

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('prompt', 'select_account');

    return {
      state,
      context: this.encodeGoogleOauthContext(context),
      maxAgeMs: GOOGLE_STATE_TTL_MS,
      redirectUrl: url.toString(),
    };
  }

  private buildGoogleFrontendRedirect(path: string, params?: Record<string, string | null | undefined>) {
    return buildPublicFrontendUrl(path, params);
  }

  private async fetchGoogleUserProfile(code: string) {
    this.assertGoogleOauthEnabled();
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const callbackUrl = String(process.env.GOOGLE_CALLBACK_URL || '').trim();
    if (!clientId || !clientSecret || !callbackUrl) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    const tokenResponse = await axios.post(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const accessToken = String(tokenResponse.data?.access_token || '').trim();
    if (!accessToken) {
      throw new UnauthorizedException('AUTH_OAUTH_STATE_INVALID');
    }

    const profileResponse = await axios.get(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = profileResponse.data || {};
    if (!profile?.email_verified) {
      throw new UnauthorizedException('AUTH_GOOGLE_EMAIL_UNVERIFIED');
    }

    return {
      providerUserId: String(profile.sub || '').trim(),
      email: this.normalizeEmail(String(profile.email || '')),
      fullName: String(profile.name || profile.given_name || 'Google User').trim() || 'Google User',
      avatarUrl: String(profile.picture || '').trim() || null,
      rawProfile: profile,
    };
  }

  private createAuthCookiePayload(
    user: { id: string; role: Role; email: string },
    session: { id: string; expiresAt: Date; audience: AuthAudience },
    refreshToken: string,
  ): AuthCookiePayload {
    return {
      audience: session.audience,
      accessToken: this.createAccessToken(user, session.id, session.audience),
      refreshToken,
      accessMaxAgeMs: this.getAccessTokenTtlMs(user.role),
      refreshMaxAgeMs: this.getRefreshTokenTtlMs(),
      csrfToken: randomBytes(24).toString('hex'),
    };
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

  private isGoogleOauthEnabled() {
    return String(process.env.AUTH_ENABLE_GOOGLE || 'false').trim().toLowerCase() === 'true';
  }

  private isPasswordResetEnabled() {
    return String(process.env.AUTH_ENABLE_PASSWORD_RESET || 'true').trim().toLowerCase() !== 'false';
  }

  private assertGoogleOauthEnabled() {
    if (!this.isGoogleOauthEnabled()) {
      throw new BadRequestException('AUTH_GOOGLE_DISABLED');
    }
  }

  private assertPasswordResetEnabled() {
    if (!this.isPasswordResetEnabled()) {
      throw new BadRequestException('AUTH_PASSWORD_RESET_DISABLED');
    }
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

  private isMitraPlaceholderEmail(email?: string | null) {
    return String(email || '').trim().toLowerCase().endsWith(`@${MITRA_PLACEHOLDER_EMAIL_DOMAIN}`);
  }

  private buildPendingMitraEmail(publicCode: string) {
    return `mitra-${String(publicCode || '').trim().toLowerCase()}@${MITRA_PLACEHOLDER_EMAIL_DOMAIN}`;
  }

  private buildPasswordResetUrl(role: Role, token: string) {
    if (role === Role.USER) {
      return buildPublicFrontendUrl(`/reset-password/${token}`);
    }
    if (role === Role.MITRA) {
      return buildDashboardFrontendUrl(`/mitra/reset-password/${token}`);
    }
    if (role === Role.YAYASAN) {
      return buildDashboardFrontendUrl(`/yayasan/reset-password/${token}`);
    }
    return buildDashboardFrontendUrl(`/reset-password/${token}`);
  }

  private async issuePasswordResetToken(userId: string) {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    const token = randomBytes(24).toString('hex');

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const row = await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hashValue(token),
        expiresAt,
      },
    });

    return { token, row };
  }

  private async sendPasswordResetEmail(user: { id: string; role: Role; email: string | null; fullName?: string | null }) {
    this.assertPasswordResetEnabled();

    const email = this.normalizeEmail(String(user.email || ''));
    if (!email) {
      return false;
    }

    const { token, row } = await this.issuePasswordResetToken(user.id);
    const resetUrl = this.buildPasswordResetUrl(user.role, token);
    const template = buildPasswordResetEmailTemplate({
      recipientName: String(user.fullName || email || 'Pelanggan NEWME').trim(),
      resetUrl,
      expiresMinutes: 30,
    });

    try {
      await this.mailService.sendMail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      return true;
    } catch (error) {
      await this.prisma.passwordResetToken.updateMany({
        where: {
          id: row.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });
      this.logger.error(
        `Failed to send password reset email to ${this.maskEmail(email)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new HttpException('MAIL_DELIVERY_FAILED', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private async requestPasswordResetByEmail(email: string, role?: Role) {
    this.assertPasswordResetEnabled();

    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        ...(role ? { role } : {}),
      },
      select: {
        id: true,
        role: true,
        email: true,
        fullName: true,
        primaryAuthProvider: true,
      },
    });

    if (!user || user.primaryAuthProvider !== AuthProvider.LOCAL) {
      return { message: 'Jika email terdaftar, link reset telah dikirim.' };
    }

    await this.sendPasswordResetEmail(user);
    return { message: 'Jika email terdaftar, link reset telah dikirim.' };
  }

  async requestPasswordResetByUserId(userId: string, expectedRole?: Role) {
    this.assertPasswordResetEnabled();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        fullName: true,
        primaryAuthProvider: true,
      },
    });

    if (!user || (expectedRole && user.role !== expectedRole)) {
      throw new UnauthorizedException('Invalid user');
    }

    if (user.primaryAuthProvider !== AuthProvider.LOCAL) {
      throw new BadRequestException('AUTH_PROVIDER_MISMATCH_GOOGLE_ONLY');
    }

    if (!String(user.email || '').trim()) {
      throw new BadRequestException('User email is required for password reset');
    }

    await this.sendPasswordResetEmail(user);
    return { message: 'Link reset password telah dikirim ke email pengguna.' };
  }

  private buildPendingRegistrationResponse(
    registrationToken: string,
    row: {
      email: string;
      fullName: string;
      verifiedAt?: Date | null;
      expiresAt: Date;
      resendAvailableAt: Date;
      role: Role;
    },
  ) {
    return {
      registrationToken,
      email: row.email,
      maskedEmail: this.maskEmail(row.email),
      fullName: row.fullName,
      role: row.role,
      verified: Boolean(row.verifiedAt),
      verifiedAt: row.verifiedAt || null,
      expiresAt: row.expiresAt,
      resendAvailableAt: row.resendAvailableAt,
    };
  }

  private async sendRegisterOtpEmail(email: string, fullName: string, otp: string) {
    const template = buildRegisterOtpEmailTemplate({
      otp,
      recipientName: fullName,
      expiresMinutes: Math.round(REGISTER_OTP_TTL_MS / 60000),
    });

    await this.mailService.sendMail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private async getPendingRegistrationOrThrow(registrationToken: string, expectedRole: Role) {
    const token = String(registrationToken || '').trim();
    if (!token) {
      throw new BadRequestException('Registration token is required');
    }

    const row = await this.prisma.pendingRegistration.findUnique({
      where: {
        registrationTokenHash: this.hashValue(token),
      },
    });

    if (!row || row.role !== expectedRole || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('REGISTRATION_SESSION_INVALID');
    }

    return { row, token };
  }

  async startRegistration(
    body: Record<string, any>,
    role: Role,
  ) {
    if (role !== Role.USER && role !== Role.YAYASAN) {
      throw new BadRequestException('Unsupported registration role');
    }

    const email = this.normalizeEmail(body.email);
    const fullName = String(body.fullName || body.name || '').trim();
    if (!email || !fullName) {
      throw new BadRequestException('Nama dan email wajib diisi.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const referralInput = body.referralCode || body.ref || body.mitra || null;
    const referral = await this.resolveReferralContext(role, referralInput);
    if (role === Role.YAYASAN && referral.referrer?.role === Role.MITRA) {
      await this.assertMitraHasCapacity(
        referral.referrer.id,
        referral.referrer.mitraProfile?.inviteCode || referral.referrer.myReferralCode || referral.referredByCode,
      );
    }

    const otp = this.generateOtpCode();
    const registrationToken = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REGISTER_OTP_TTL_MS);
    const resendAvailableAt = new Date(now.getTime() + REGISTER_OTP_RESEND_COOLDOWN_MS);
    const passwordHash = await this.hashPassword(body.password || 'ChangeMe123!');

    await this.prisma.pendingRegistration.updateMany({
      where: {
        email,
        role,
        consumedAt: null,
      },
      data: {
        consumedAt: now,
      },
    });

    const row = await this.prisma.pendingRegistration.create({
      data: {
        role,
        email,
        fullName,
        passwordHash,
        referralContext: {
          referralCode: referralInput || null,
          referredByCode: referral.referredByCode || null,
        },
        registrationTokenHash: this.hashValue(registrationToken),
        otpHash: this.hashValue(otp),
        otpExpiresAt: expiresAt,
        resendAvailableAt,
        expiresAt,
      },
    });

    try {
      await this.sendRegisterOtpEmail(email, fullName, otp);
    } catch (error) {
      await this.prisma.pendingRegistration.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });
      this.logger.error(
        `Failed to send registration OTP email to ${this.maskEmail(email)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new HttpException('MAIL_DELIVERY_FAILED', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return this.buildPendingRegistrationResponse(registrationToken, row);
  }

  async verifyRegistrationOtp(registrationToken: string, otp: string, role: Role) {
    const { row, token } = await this.getPendingRegistrationOrThrow(registrationToken, role);
    if (row.verifiedAt) {
      return this.buildPendingRegistrationResponse(token, row);
    }

    if (row.attemptCount >= REGISTER_OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException('REGISTRATION_OTP_ATTEMPTS_EXCEEDED');
    }

    if (row.otpExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('REGISTRATION_OTP_EXPIRED');
    }

    const normalizedOtp = String(otp || '').trim();
    if (this.hashValue(normalizedOtp) !== row.otpHash) {
      const nextAttempts = row.attemptCount + 1;
      await this.prisma.pendingRegistration.update({
        where: { id: row.id },
        data: { attemptCount: nextAttempts },
      });
      if (nextAttempts >= REGISTER_OTP_MAX_ATTEMPTS) {
        throw new ForbiddenException('REGISTRATION_OTP_ATTEMPTS_EXCEEDED');
      }
      throw new UnauthorizedException('REGISTRATION_OTP_INVALID');
    }

    const updated = await this.prisma.pendingRegistration.update({
      where: { id: row.id },
      data: {
        verifiedAt: new Date(),
      },
    });

    return this.buildPendingRegistrationResponse(token, updated);
  }

  async resendRegistrationOtp(registrationToken: string, role: Role) {
    const { row, token } = await this.getPendingRegistrationOrThrow(registrationToken, role);
    if (row.resendAvailableAt.getTime() > Date.now()) {
      throw new ForbiddenException('REGISTRATION_OTP_RESEND_COOLDOWN');
    }

    const otp = this.generateOtpCode();
    const now = new Date();
    const otpExpiresAt = new Date(now.getTime() + REGISTER_OTP_TTL_MS);
    const resendAvailableAt = new Date(now.getTime() + REGISTER_OTP_RESEND_COOLDOWN_MS);
    const updated = await this.prisma.pendingRegistration.update({
      where: { id: row.id },
      data: {
        otpHash: this.hashValue(otp),
        otpExpiresAt,
        resendAvailableAt,
        attemptCount: 0,
      },
    });

    await this.sendRegisterOtpEmail(updated.email, updated.fullName, otp);
    return this.buildPendingRegistrationResponse(token, updated);
  }

  async completeRegistration(
    body: Record<string, any> & { registrationToken?: string },
    role: Role,
    auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const { row } = await this.getPendingRegistrationOrThrow(body.registrationToken || '', role);
    if (!row.verifiedAt) {
      throw new ForbiddenException('REGISTRATION_EMAIL_NOT_VERIFIED');
    }

    const payload = {
      ...body,
      email: row.email,
      fullName: row.fullName,
      name: row.fullName,
      referralCode: body.referralCode || body.ref || body.mitra || this.safeObject(row.referralContext).referralCode || null,
    };

    const response = await this.register(payload, role, false, auditMeta, {
      passwordHash: row.passwordHash,
      emailVerifiedAt: row.verifiedAt,
    });

    await this.prisma.pendingRegistration.update({
      where: { id: row.id },
      data: {
        consumedAt: new Date(),
        payload: payload,
      },
    });

    return response;
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
      inviteUrl: plainToken ? buildDashboardFrontendUrl('/mitra/claim', { token: plainToken }) : null,
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
      if (String(input.action || '').trim().toUpperCase().startsWith('ADMIN_')) {
        this.adminActivityLogService.recordRaw({
          actorUserId: input.actorUserId || null,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId || null,
          payload: (input.payload || {}) as Prisma.InputJsonValue,
          ipAddress: input.ipAddress || null,
        });
        return;
      }
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
      authProvider: user.primaryAuthProvider || AuthProvider.LOCAL,
      hasPassword: Boolean(user.passwordHash),
      avatarUrl: user.avatarUrl || null,
      onboardingCompleted: Boolean(user.onboardingCompletedAt),
      onboardingCompletedAt: user.onboardingCompletedAt || null,
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

  private buildAuthSuccessResponse(
    user: { id: string; role: Role; email: string },
    session: { id: string; expiresAt: Date; audience: AuthAudience },
    refreshToken: string,
    mappedUser: any,
    extra: Record<string, any> = {},
  ) {
    return {
      success: true,
      session: this.buildSessionMetadata(user, session),
      user: mappedUser,
      cookies: this.createAuthCookiePayload(user, session, refreshToken),
      ...extra,
    };
  }

  private async findSessionByRefreshToken(refreshToken: string, audience: AuthAudience) {
    const normalized = String(refreshToken || '').trim();
    if (!normalized) {
      throw new UnauthorizedException('AUTH_REFRESH_INVALID');
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        audience,
        refreshTokenHash: this.hashValue(normalized),
        revokedAt: null,
      },
      include: {
        user: {
          include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
        },
      },
    });

    if (
      !session
      || session.expiresAt.getTime() <= Date.now()
      || session.absoluteExpiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('AUTH_REFRESH_INVALID');
    }

    return session;
  }

  async refreshSessionByRefreshToken(audience: AuthAudience, refreshToken: string) {
    const sessionRow = await this.findSessionByRefreshToken(refreshToken, audience);
    const user = sessionRow.user;
    if (!user) {
      throw new UnauthorizedException('AUTH_REFRESH_INVALID');
    }

    const nextRefreshToken = randomBytes(48).toString('hex');
    const session = await this.extendSession(sessionRow.id, user.role, nextRefreshToken);
    const mappedUser = await this.mapUserWithComputedStats(user);
    return this.buildAuthSuccessResponse(
      user,
      { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
      nextRefreshToken,
      mappedUser,
      {
        ...(audience === AuthAudience.ADMIN ? { admin: mappedUser } : {}),
        ...(audience === AuthAudience.YAYASAN ? { yayasan: mappedUser } : {}),
        ...(audience === AuthAudience.MITRA ? { mitra: mappedUser } : {}),
      },
    );
  }

  async register(
    body: Record<string, any>,
    role: Role,
    _adminShape = false,
    auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
    options: { passwordHash?: string | null; emailVerifiedAt?: Date | null } = {},
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
    const passwordHash = options.passwordHash || await this.hashPassword(body.password || 'ChangeMe123!');

    const user = await this.prisma.user.create({
      data: {
        email,
        username: username || null,
        fullName: body.fullName || body.name || 'User',
        passwordHash,
        phone,
        role: targetRole,
        emailVerifiedAt: options.emailVerifiedAt || null,
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

    const { session, refreshToken } = await this.createAuthSession(user, auditMeta, resolveAudienceFromRole(targetRole));
    const mappedUser = await this.mapUserWithComputedStats(user);
    return this.buildAuthSuccessResponse(
      user,
      { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
      refreshToken,
      mappedUser,
      {
        admin: this.isAdminPanelRole(targetRole) ? mappedUser : undefined,
        yayasan: targetRole === Role.YAYASAN ? mappedUser : undefined,
        mitra: undefined,
        message: 'Registrasi berhasil',
      },
    );
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

    if (user.primaryAuthProvider === AuthProvider.GOOGLE || !user.passwordHash) {
      this.buildProviderMismatchError(AuthProvider.GOOGLE);
    }

    const passwordCheck = await this.verifyPassword(body.password || '', user.passwordHash);
    if (!passwordCheck.valid) {
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

    if (passwordCheck.needsUpgrade) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await this.hashPassword(body.password || ''),
        },
      });
    }

    if (role === Role.MITRA) {
      if (user.status === AccountStatus.PENDING_VERIFICATION) {
        throw new UnauthorizedException('Akun mitra Anda belum aktif. Silakan buka link undangan dari admin NEWME terlebih dahulu.');
      }
    }

    const { session, refreshToken } = await this.createAuthSession(user, auditMeta, resolveAudienceFromRole(user.role));
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
      return this.buildAuthSuccessResponse(
        user,
        { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
        refreshToken,
        mappedUser,
        { admin: mappedUser },
      );
    }

    return this.buildAuthSuccessResponse(
      user,
      { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
      refreshToken,
      mappedUser,
      {
        yayasan: role === Role.YAYASAN ? mappedUser : undefined,
        mitra: role === Role.MITRA ? mappedUser : undefined,
      },
    );
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

    if (user.primaryAuthProvider === AuthProvider.GOOGLE || !user.passwordHash) {
      this.buildProviderMismatchError(AuthProvider.GOOGLE);
    }

    const passwordCheck = await this.verifyPassword(body.password || '', user.passwordHash);
    if (!passwordCheck.valid) {
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

    if (passwordCheck.needsUpgrade) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await this.hashPassword(body.password || ''),
        },
      });
    }

    const { session, refreshToken } = await this.createAuthSession(user, auditMeta, AuthAudience.ADMIN);
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

    return this.buildAuthSuccessResponse(
      user,
      { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
      refreshToken,
      mappedUser,
      { admin: mappedUser },
    );
  }

  async getProfile(userId: string, sessionId?: string | null, audience?: AuthAudience | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    const mappedUser = await this.mapUserWithComputedStats(user);
    if (!user) return mappedUser;

    let sessionMeta: SessionMetadata | null = null;
    if (sessionId) {
      const session = await this.getValidSessionOrThrow(userId, sessionId, audience || undefined);
      sessionMeta = this.buildSessionMetadata(user, session);
    }

    return {
      ...mappedUser,
      session: sessionMeta,
    };
  }

  async getSessionState(userId: string, sessionId?: string | null, audience?: AuthAudience | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const session = await this.getValidSessionOrThrow(userId, sessionId, audience || undefined);
    const mappedUser = await this.mapUserWithComputedStats(user);

    return {
      authenticated: true,
      viewer: this.buildSessionViewer(mappedUser),
      session: this.buildSessionMetadata(user, session),
    };
  }

  async getSessionStateFromAccessToken(accessToken?: string | null, audience?: AuthAudience | null) {
    const token = String(accessToken || '').trim();
    const fallback = {
      authenticated: false,
      viewer: null,
      session: null,
    };

    if (!token || !audience) {
      return fallback;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      }) as { sub?: string; sid?: string; aud?: string };

      const userId = String(payload?.sub || '').trim();
      const sessionId = String(payload?.sid || '').trim();
      const tokenAudience = String(payload?.aud || '').trim();

      if (!userId || !sessionId || (tokenAudience && tokenAudience !== audience)) {
        return fallback;
      }

      return this.getSessionState(userId, sessionId, audience);
    } catch {
      return fallback;
    }
  }

  async refreshSession(userId: string, sessionId?: string | null, audience?: AuthAudience | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const existingSession = await this.getValidSessionOrThrow(userId, sessionId, audience || undefined);
    const nextRefreshToken = randomBytes(48).toString('hex');
    const session = await this.extendSession(existingSession.id, user.role, nextRefreshToken);
    return {
      success: true,
      session: this.buildSessionMetadata(user, session),
      cookies: this.createAuthCookiePayload(
        user,
        { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
        nextRefreshToken,
      ),
    };
  }

  async logout(userId: string, sessionId?: string | null, audience?: AuthAudience | null) {
    await this.getValidSessionOrThrow(userId, sessionId, audience || undefined);
    const revokedAt = new Date();
    await this.prisma.authSession.update({
      where: {
        id: String(sessionId || '').trim(),
      },
      data: {
        revokedAt,
        expiresAt: revokedAt,
      },
    });

    return {
      success: true,
      message: 'Logout berhasil.',
    };
  }

  async handleGoogleCallback(input: {
    code?: string | null;
    state?: string | null;
    error?: string | null;
    expectedState?: string | null;
    encodedContext?: string | null;
    auditMeta?: { ipAddress?: string | null; userAgent?: string | null };
  }) {
    this.assertGoogleOauthEnabled();
    const auditMeta = input.auditMeta || {};
    const context = this.decodeGoogleOauthContext(input.encodedContext);
    const loginRedirect = this.buildGoogleFrontendRedirect('/login', {
      oauth: 'google',
      error: 'oauth_failed',
    });

    if (input.error) {
      return {
        redirectUrl: this.buildGoogleFrontendRedirect('/login', {
          oauth: 'google',
          error: 'oauth_cancelled',
        }),
      };
    }

    if (!input.code || !input.state || String(input.state).trim() !== String(input.expectedState || '').trim()) {
      return {
        redirectUrl: this.buildGoogleFrontendRedirect('/login', {
          oauth: 'google',
          error: 'oauth_state_invalid',
        }),
      };
    }

    try {
      const googleProfile = await this.fetchGoogleUserProfile(String(input.code || '').trim());
      const identity = await this.prisma.authIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: AuthProvider.GOOGLE,
            providerUserId: googleProfile.providerUserId,
          },
        },
        include: {
          user: {
            include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
          },
        },
      });

      let user = identity?.user || null;
      if (!user) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: googleProfile.email },
          include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
        });
        if (existingUser) {
          if (existingUser.primaryAuthProvider !== AuthProvider.GOOGLE) {
            throw new ConflictException('AUTH_PROVIDER_MISMATCH_MANUAL_ONLY');
          }
          await this.prisma.authIdentity.create({
            data: {
              userId: existingUser.id,
              provider: AuthProvider.GOOGLE,
              providerUserId: googleProfile.providerUserId,
              providerEmail: googleProfile.email,
              providerEmailVerified: true,
              avatarUrl: googleProfile.avatarUrl,
              rawProfile: googleProfile.rawProfile,
              lastLoginAt: new Date(),
            },
          });
          user = await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              avatarUrl: googleProfile.avatarUrl,
              emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
            },
            include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
          });
        }
        if (!user) {
          const referral = await this.resolveReferralContext(Role.USER, context.referralCode);
          const publicCode = await this.generateUniqueBusinessCode(Role.USER);
          user = await this.prisma.user.create({
            data: {
              email: googleProfile.email,
              fullName: googleProfile.fullName,
              passwordHash: null,
              phone: null,
              role: Role.USER,
              primaryAuthProvider: AuthProvider.GOOGLE,
              avatarUrl: googleProfile.avatarUrl,
              onboardingCompletedAt: null,
              status: AccountStatus.ACTIVE,
              emailVerifiedAt: new Date(),
              myReferralCode: publicCode,
              referredByCode: referral.referredByCode,
              wallet: { create: { availableBalance: 0, reserveBalance: 0 } },
              profile: {
                create: {
                  extra: {
                    publicCode,
                    referralSource: 'google_oauth',
                    ...referral.profileExtra,
                  },
                },
              },
              authIdentities: {
                create: {
                  provider: AuthProvider.GOOGLE,
                  providerUserId: googleProfile.providerUserId,
                  providerEmail: googleProfile.email,
                  providerEmailVerified: true,
                  avatarUrl: googleProfile.avatarUrl,
                  rawProfile: googleProfile.rawProfile,
                  lastLoginAt: new Date(),
                },
              },
            },
            include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
          });
        }
      } else {
        if (user.primaryAuthProvider !== AuthProvider.GOOGLE) {
          throw new ConflictException('AUTH_PROVIDER_MISMATCH_MANUAL_ONLY');
        }
        await this.prisma.authIdentity.update({
          where: {
            provider_providerUserId: {
              provider: AuthProvider.GOOGLE,
              providerUserId: googleProfile.providerUserId,
            },
          },
          data: {
            providerEmail: googleProfile.email,
            providerEmailVerified: true,
            avatarUrl: googleProfile.avatarUrl,
            rawProfile: googleProfile.rawProfile,
            lastLoginAt: new Date(),
          },
        });
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            fullName: user.fullName || googleProfile.fullName,
            avatarUrl: googleProfile.avatarUrl,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
          },
          include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
        });
      }

      const { session, refreshToken } = await this.createAuthSession(user, auditMeta, AuthAudience.USER);
      const mappedUser = await this.mapUserWithComputedStats(user);
      const next = mappedUser?.onboardingCompleted ? 'dashboard' : 'complete-profile';

      return {
        cookies: this.createAuthCookiePayload(
          user,
          { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
          refreshToken,
        ),
        redirectUrl: this.buildGoogleFrontendRedirect('/auth/google/callback', {
          oauth: 'google',
          status: 'success',
          next,
          target: next === 'dashboard' ? context.target : '/auth/google/complete-profile',
        }),
      };
    } catch (error) {
      const normalized = error instanceof Error ? error.message : '';
      if (normalized === 'AUTH_GOOGLE_EMAIL_UNVERIFIED') {
        return {
          redirectUrl: this.buildGoogleFrontendRedirect('/login', {
            oauth: 'google',
            error: 'google_email_unverified',
          }),
        };
      }
      if (normalized === 'AUTH_PROVIDER_MISMATCH_MANUAL_ONLY') {
        return {
          redirectUrl: this.buildGoogleFrontendRedirect('/login', {
            oauth: 'google',
            error: 'provider_mismatch_manual_exists',
          }),
        };
      }
      return { redirectUrl: loginRedirect };
    }
  }

  async completeGoogleProfile(userId: string, body: CompleteGoogleProfileDto) {
    this.assertGoogleOauthEnabled();
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });
    if (!existing || existing.role !== Role.USER) {
      throw new UnauthorizedException('Invalid user');
    }
    if (existing.primaryAuthProvider !== AuthProvider.GOOGLE) {
      throw new BadRequestException('AUTH_PROVIDER_MISMATCH_MANUAL_ONLY');
    }

    const nextPhone = this.normalizePhone(body.phone);
    if (!nextPhone) {
      throw new BadRequestException('Phone or WhatsApp already registered');
    }

    const phoneUsed = await this.prisma.user.findFirst({
      where: { phone: nextPhone, id: { not: userId } },
      select: { id: true },
    });
    if (phoneUsed) {
      throw new ConflictException('Phone or WhatsApp already registered');
    }

    const birthDate = this.parseBirthDate(body.birthDate);
    const existingExtra =
      existing.profile?.extra && typeof existing.profile.extra === 'object'
        ? (existing.profile.extra as Record<string, any>)
        : {};

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: nextPhone,
        onboardingCompletedAt: new Date(),
        profile: {
          upsert: {
            create: {
              birthDate,
              province: body.province,
              city: body.city,
              district: body.district,
              village: body.village || null,
              extra: {
                ...existingExtra,
                address: body.address,
                referralSource: body.referralSource,
                referralOther: body.referralOther || null,
              },
            },
            update: {
              birthDate,
              province: body.province,
              city: body.city,
              district: body.district,
              village: body.village || null,
              extra: {
                ...existingExtra,
                address: body.address,
                referralSource: body.referralSource,
                referralOther: body.referralOther || null,
              },
            },
          },
        },
      },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    const mappedUser = await this.mapUserWithComputedStats(updated);
    return {
      success: true,
      user: mappedUser,
      message: 'Profil Google berhasil dilengkapi.',
    };
  }

  async createBridgeTicket(
    userId: string,
    sessionId?: string | null,
    rawTarget?: string | null,
    _auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, status: true },
    });

    if (!user || user.role !== Role.USER || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Bridge ticket can only be created for active user sessions');
    }

    const session = await this.getValidSessionOrThrow(userId, sessionId);
    const targetPath = this.normalizeBridgeTarget(rawTarget);
    const plainTicket = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + BRIDGE_TICKET_TTL_MS);

    await this.prisma.authBridgeTicket.create({
      data: {
        userId: user.id,
        sourceSessionId: session.id,
        tokenHash: this.hashValue(plainTicket),
        targetPath,
        expiresAt,
      },
    });

    return {
      success: true,
      ticket: plainTicket,
      target: targetPath,
      expiresAt,
    };
  }

  async exchangeBridgeTicket(
    rawTicket: string,
    auditMeta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    const ticket = String(rawTicket || '').trim();
    if (!ticket) {
      throw new UnauthorizedException('Bridge ticket is required');
    }

    const tokenHash = this.hashValue(ticket);
    const existing = await this.prisma.authBridgeTicket.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        sourceSessionId: true,
        targetPath: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!existing || existing.consumedAt || existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Bridge ticket is invalid or expired');
    }

    const payload = await this.prisma.$transaction(async (tx) => {
      const current = await tx.authBridgeTicket.findUnique({
        where: { id: existing.id },
        select: {
          id: true,
          userId: true,
          sourceSessionId: true,
          targetPath: true,
          expiresAt: true,
          consumedAt: true,
        },
      });

      if (!current || current.consumedAt || current.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Bridge ticket is invalid or expired');
      }

      if (current.sourceSessionId) {
        const sourceSession = await tx.authSession.findFirst({
          where: {
            id: current.sourceSessionId,
            userId: current.userId,
            revokedAt: null,
          },
        });

        if (
          !sourceSession
          || sourceSession.expiresAt.getTime() <= Date.now()
          || sourceSession.absoluteExpiresAt.getTime() <= Date.now()
        ) {
          throw new UnauthorizedException('Source session is no longer valid');
        }
      }

      const user = await tx.user.findUnique({
        where: { id: current.userId },
        include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
      });

      if (!user || user.role !== Role.USER || user.status !== AccountStatus.ACTIVE) {
        throw new UnauthorizedException('Bridge ticket user is not allowed');
      }

      const consumed = await tx.authBridgeTicket.updateMany({
        where: {
          id: current.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      if (consumed.count !== 1) {
        throw new UnauthorizedException('Bridge ticket has already been used');
      }

      const { session, refreshToken } = await this.createAuthSessionWithClient(tx, user, auditMeta, AuthAudience.USER);
      return {
        user,
        session,
        refreshToken,
        targetPath: this.normalizeBridgeTarget(current.targetPath),
      };
    });

    const mappedUser = await this.mapUserWithComputedStats(payload.user);

    return this.buildAuthSuccessResponse(
      payload.user,
      { id: payload.session.id, expiresAt: payload.session.expiresAt, audience: payload.session.audience },
      payload.refreshToken,
      mappedUser,
      { target: payload.targetPath },
    );
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
                yayasanLogoUrl: body.yayasanLogoUrl ?? existingExtra.yayasanLogoUrl ?? null,
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
                yayasanLogoUrl: body.yayasanLogoUrl ?? existingExtra.yayasanLogoUrl ?? null,
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
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryAuthProvider: true, passwordHash: true },
    });
    if (existing?.primaryAuthProvider === AuthProvider.GOOGLE) {
      throw new BadRequestException('AUTH_PROVIDER_MISMATCH_GOOGLE_ONLY');
    }

    const currentPassword = String(body.currentPassword || '').trim();
    const nextPassword = String(body.newPassword || body.password || '').trim();
    if (!currentPassword || !nextPassword) {
      throw new BadRequestException('Current password dan password baru wajib diisi.');
    }

    const currentCheck = await this.verifyPassword(currentPassword, existing?.passwordHash);
    if (!currentCheck.valid) {
      throw new UnauthorizedException('Current password is invalid');
    }

    const reusedPasswordCheck = await this.verifyPassword(nextPassword, existing?.passwordHash);
    if (reusedPasswordCheck.valid) {
      throw new BadRequestException('Password baru harus berbeda dari password saat ini.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.hashPassword(nextPassword) },
    });
    await this.revokeUserSessions(userId);

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

    const passwordHash = await this.hashPassword(body.password || 'ChangeMe123!');
    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: invite.userId },
        data: {
          fullName,
          email,
          phone: phone || null,
          passwordHash,
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

    const { session, refreshToken } = await this.createAuthSession(user, auditMeta, AuthAudience.MITRA);
    const mappedUser = await this.mapUserWithComputedStats(user);
    return this.buildAuthSuccessResponse(
      user,
      { id: session.id, expiresAt: session.expiresAt, audience: session.audience },
      refreshToken,
      mappedUser,
      {
        mitra: mappedUser,
        message: 'Akun mitra berhasil diaktifkan.',
      },
    );
  }

  async forgotPassword(email: string, role: Role = Role.USER) {
    return this.requestPasswordResetByEmail(email, role);
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashValue(token || '');
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException('PASSWORD_RESET_TOKEN_INVALID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: row.userId },
      select: { primaryAuthProvider: true },
    });
    if (user?.primaryAuthProvider === AuthProvider.GOOGLE) {
      throw new BadRequestException('AUTH_PROVIDER_MISMATCH_GOOGLE_ONLY');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: await this.hashPassword(password || 'ChangeMe123!') },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: row.userId,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId: row.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset success' };
  }

  async getReferralLink(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      referralCode: user?.myReferralCode,
      referralLink: `${getPublicFrontendBaseUrl()}/register?ref=${user?.myReferralCode || ''}`,
    };
  }

  async getAdminUsers(query: { page?: string | number; pageSize?: string | number; search?: string } = {}) {
    await this.adminRbacService.ensureAdminRbacReady();

    const { page, pageSize, skip, take } = resolvePagination(query, { pageSize: 10, maxPageSize: 100 });
    const normalizedSearch = String(query.search || '').trim();
    const where: any = {
      role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR] },
      NOT: {
        adminRole: {
          is: {
            slug: DEVELOPER_ROOT_ROLE_SLUG,
          },
        },
      },
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
