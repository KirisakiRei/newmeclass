import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, PaymentStatus, Role, YayasanApprovalStatus } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'crypto';
import { mapUserForClient } from 'src/common/mappers/client-shapes';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type AuditInput = {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  payload?: Record<string, any>;
  ipAddress?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private randomCode(prefix: string): string {
    return `${prefix}${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private normalizeEmail(email: string) {
    return String(email || '').trim().toLowerCase();
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

  private getBusinessPrefix(role: Role) {
    if (role === Role.MITRA) return 'M';
    if (role === Role.YAYASAN) return 'Y';
    if (role === Role.USER) return 'U';
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
      ...stats,
      publicId: user.myReferralCode || null,
      businessId: user.myReferralCode || null,
      memberCode: user.myReferralCode || null,
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

  async register(body: RegisterDto & Record<string, any>, role: Role) {
    const email = this.normalizeEmail(body.email);
    const phone = this.normalizePhone(body.phone || body.whatsapp);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findFirst({ where: { phone } });
      if (existingPhone) {
        throw new ConflictException('Phone or WhatsApp already registered');
      }
    }

    const referralInput = body.referralCode || body.ref || body.mitra || null;
    const referral = await this.resolveReferralContext(role, referralInput);
    const publicCode = await this.generateUniqueBusinessCode(role);
    const birthDate = this.parseBirthDate(body.birthDate);
    const institutionName =
      role === Role.YAYASAN ? body.institutionName || body.fullName || body.name || 'Yayasan' : undefined;

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: body.fullName || body.name || 'User',
        passwordHash: this.hashValue(body.password || 'ChangeMe123!'),
        phone,
        role,
        status:
          role === Role.USER || role === Role.ADMIN || role === Role.SUPERADMIN || role === Role.YAYASAN
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
          role === Role.YAYASAN
            ? {
                create: {
                  institutionName: institutionName!,
                  referralPrice: 0,
                  mitraShare: 0,
                  approvalStatus: YayasanApprovalStatus.PENDING_MITRA_APPROVAL,
                },
              }
            : undefined,
        mitraProfile:
          role === Role.MITRA
            ? {
                create: {
                  inviteCode: publicCode,
                },
              }
            : undefined,
      },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    const token = this.jwtService.sign(
      { sub: user.id, role: user.role, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
    const mappedUser = await this.mapUserWithComputedStats(user);

    return {
      success: true,
      token,
      access_token: token,
      user: mappedUser,
      admin: role === Role.ADMIN ? mappedUser : undefined,
      yayasan: role === Role.YAYASAN ? mappedUser : undefined,
      mitra: role === Role.MITRA ? mappedUser : undefined,
      message: 'Registrasi berhasil',
    };
  }

  async login(
    body: LoginDto,
    role: Role,
    adminShape = false,
    auditMeta: { ipAddress?: string | null } = {},
  ) {
    const email = this.normalizeEmail(body.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });
    const roleAllowed =
      role === Role.ADMIN
        ? user?.role === Role.ADMIN || user?.role === Role.SUPERADMIN
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

    const token = this.jwtService.sign(
      { sub: user.id, role: user.role, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
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
        user: mappedUser,
        admin: mappedUser,
      };
    }

    return {
      success: true,
      token,
      access_token: token,
      user: mappedUser,
      yayasan: role === Role.YAYASAN ? mappedUser : undefined,
      mitra: role === Role.MITRA ? mappedUser : undefined,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true, yayasanProfile: true, mitraProfile: true },
    });

    return this.mapUserWithComputedStats(user);
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

  async getAdminUsers() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPERADMIN] } },
    });
  }

  async getAdminDashboardStats() {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [totalUsers, totalPayments, pendingPayments, monthlyRevenue, registrationTotal, registrationRecent, contactTotal, contactRecent] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.paymentOrder.count(),
      this.prisma.paymentOrder.count({ where: { status: PaymentStatus.PENDING } }),
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
    ]);

    return {
      totalUsers,
      totalPayments,
      pendingPayments,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
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
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Admin deleted' };
  }
}
