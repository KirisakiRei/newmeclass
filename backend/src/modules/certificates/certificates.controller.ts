import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthAudience, CertificateType, Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { mkdirSync } from 'fs';
import { mkdir, stat } from 'fs/promises';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuthAudienceAccess } from 'src/common/auth/auth-audience.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { buildPublicFrontendUrl } from 'src/common/frontend-urls';
import { buildCertificateQrCodeDataUrl } from 'src/common/utils/certificate-qr';
import { buildSimplePdf } from 'src/common/utils/pdf';
import {
  buildCertificateTemplateMetadata,
  ensureDemoCertificateTemplate,
  ensureDemoPersonalityTemplates,
  mapCertificateTemplateForClient,
  serializeCertificateTemplateForStorage,
} from 'src/common/demo-frontend-reference';
import { mapTestResultForClient } from 'src/common/mappers/test-result-client-shapes';
import {
  pickPreferredPersonalityTemplate,
  stripPersonalityCodeModifier,
} from 'src/common/personality-template-catalog';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminRbacService } from '../admin-rbac/admin-rbac.service';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatePdfCacheService } from './certificate-pdf-cache.service';

const CERT_DOWNLOAD_RATE_LIMIT_TTL_MS = Number(process.env.CERT_DOWNLOAD_RATE_LIMIT_TTL || 60) * 1000;
const CERT_DOWNLOAD_RATE_LIMIT = Number(process.env.CERT_DOWNLOAD_RATE_LIMIT || 30);
const CERT_AI_DOWNLOAD_RATE_LIMIT = Number(process.env.CERT_AI_DOWNLOAD_RATE_LIMIT || 20);
const CERT_GENERATE_RATE_LIMIT = Number(process.env.CERT_GENERATE_RATE_LIMIT || 15);

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminRbacService: AdminRbacService,
    private readonly certificatePdfCacheService: CertificatePdfCacheService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  private safeObject(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private toCertificateType(value?: string | null) {
    return String(value || '').toLowerCase() === 'yayasan'
      ? CertificateType.YAYASAN
      : CertificateType.INDIVIDU;
  }

  private stripSecondaryLogoFromTemplate(template: any) {
    if (!template || typeof template !== 'object') return template;
    return {
      ...template,
      secondaryLogoUrl: null,
      logoUrl: null,
    };
  }

  private uploadsDir() {
    const dir = resolve(process.cwd(), 'uploads', 'certificates');
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private publicUploadUrl(_request: Request, fileName: string) {
    return `/uploads/certificates/${fileName}`;
  }

  private sanitizeFileSegment(value: string) {
    return value.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'asset';
  }

  private resolveLocalUploadPath(uploadUrl?: string | null) {
    const normalized = String(uploadUrl || '').trim();
    if (!normalized.startsWith('/uploads/')) {
      return null;
    }

    const uploadsRoot = resolve(process.cwd(), 'uploads');
    const absolutePath = resolve(process.cwd(), normalized.replace(/^\/+/, ''));
    if (!absolutePath.startsWith(uploadsRoot)) {
      return null;
    }

    return absolutePath;
  }

  private async ensurePngUploadVariant(uploadUrl?: string | null) {
    const normalized = String(uploadUrl || '').trim();
    if (!normalized || !/\.webp(?:$|[?#])/i.test(normalized)) {
      return normalized || null;
    }

    const sourcePath = this.resolveLocalUploadPath(normalized);
    if (!sourcePath) {
      return normalized;
    }

    try {
      const sourceStat = await stat(sourcePath);
      const cacheKey = createHash('sha256')
        .update(`${normalized}:${sourceStat.size}:${sourceStat.mtimeMs}`)
        .digest('hex')
        .slice(0, 24);

      const cacheDir = resolve(process.cwd(), 'uploads', 'certificates', 'derived');
      const outputPath = resolve(cacheDir, `${cacheKey}.png`);
      const publicPath = `/uploads/certificates/derived/${cacheKey}.png`;

      try {
        await stat(outputPath);
        return publicPath;
      } catch {}

      await mkdir(cacheDir, { recursive: true });
      await sharp(sourcePath)
        .png()
        .toFile(outputPath);

      return publicPath;
    } catch {
      return normalized;
    }
  }

  private async findLatestCertificateResult(userId: string, includeUser = false) {
    const baseWhere = { userId };
    const baseSelect = includeUser
      ? {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              myReferralCode: true,
              role: true,
              profile: {
                select: {
                  province: true,
                  city: true,
                  extra: true,
                },
              },
            },
          },
        }
      : undefined;

    const latestPaid = await this.prisma.testResult.findFirst({
      where: { ...baseWhere, testType: 'paid' },
      orderBy: { createdAt: 'desc' },
      ...(baseSelect ? { include: baseSelect } : {}),
    });

    if (latestPaid) {
      return latestPaid;
    }

    return this.prisma.testResult.findFirst({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      ...(baseSelect ? { include: baseSelect } : {}),
    });
  }

  private buildCertificatePersonalityData(resultDto: any, existingData: Record<string, any> = {}) {
    const source = this.safeObject(existingData);
    const analysis = this.safeObject(resultDto?.analysis);
    const insights = this.safeObject(analysis.insights);
    const personalInsights = this.safeObject(analysis.personalInsights || analysis.aiInsights);
    const displayAnalysis = this.safeObject(resultDto?.displayAnalysis);

    return {
      ...source,
      code: resultDto?.personalityCode || source.code || null,
      personalityType:
        displayAnalysis.personalityType
        || analysis.personalityType
        || source.personalityType
        || source.personalityLabel
        || null,
      personalityLabel:
        insights.personalityLabel
        || source.personalityLabel
        || displayAnalysis.personalityType
        || analysis.personalityType
        || null,
      dominantElement: resultDto?.dominantElement || analysis.dominantElement || source.dominantElement || null,
      summary: displayAnalysis.summary || source.summary || personalInsights.ringkasanKepribadian || '',
      elementDescription:
        insights.elementDescription
        || source.elementDescription
        || personalInsights.ringkasanKepribadian
        || [],
      karakter:
        insights.karakter
        || source.karakter
        || personalInsights.tipsPraktis
        || [],
      ciriKhas:
        insights.ciriKhas
        || source.ciriKhas
        || personalInsights.tipsPraktis
        || [],
      rekomendasiKarir:
        insights.rekomendasiKarir
        || insights.dibutuhkanPadaProfesi
        || source.rekomendasiKarir
        || personalInsights.rekomendasiKarirSpesifik
        || '',
      kekuatanJatidiri:
        insights.kekuatanJatidiri
        || source.kekuatanJatidiri
        || {},
      kompilasiAdaptasi:
        insights.kompilasiAdaptasi
        || source.kompilasiAdaptasi
        || personalInsights.strategiPengembanganDiri
        || {},
      elementScores:
        displayAnalysis.elementScores
        || analysis.elementScores
        || source.elementScores
        || {},
    };
  }

  private async findTemplateForResult(result: {
    personalityCode?: string | null;
    socialType?: string | null;
    dominantElement?: string | null;
  }) {
    await ensureDemoPersonalityTemplates(this.prisma);
    const preferredCode = stripPersonalityCodeModifier(result.personalityCode);

    for (const candidateCode of [result.personalityCode, preferredCode]) {
      if (!candidateCode) continue;
      const byCode = await this.prisma.personalityResultTemplate.findUnique({
        where: { code: candidateCode },
      });
      if (byCode) return byCode;
    }

    if (result.socialType && result.dominantElement) {
      const byElement = await this.prisma.personalityResultTemplate.findMany({
        where: {
          socialType: result.socialType,
          element: result.dominantElement.toLowerCase(),
        },
      });
      const preferredTemplate = pickPreferredPersonalityTemplate(
        byElement,
        preferredCode || result.personalityCode || null,
      );
      if (preferredTemplate) return preferredTemplate;
    }

    return null;
  }

  private async resolvePersonalityData(input: {
    userId?: string | null;
    testResultId?: string | null;
    metadata?: unknown;
  }) {
    const metadata = this.safeObject(input.metadata);
    const existingData = this.safeObject(metadata.personalityData);

    const result = input.testResultId
      ? await this.prisma.testResult.findUnique({
          where: { id: input.testResultId },
        })
      : input.userId
        ? await this.findLatestCertificateResult(input.userId)
        : null;

    if (!result) {
      return {
        personalityCode: metadata.personalityCode || null,
        personalityType: metadata.personalityType || null,
        personalityData: Object.keys(existingData).length ? existingData : null,
      };
    }

    const resultDto = await mapTestResultForClient(this.prisma, result as any);
    const normalizedPersonalityData = this.buildCertificatePersonalityData(resultDto, existingData);

    return {
      personalityCode:
        resultDto?.personalityCode
        || metadata.personalityCode
        || normalizedPersonalityData.code
        || null,
      personalityType:
        resultDto?.displayAnalysis?.personalityType
        || metadata.personalityType
        || normalizedPersonalityData.personalityType
        || normalizedPersonalityData.personalityLabel
        || null,
      personalityData: normalizedPersonalityData,
    };
  }

  private async enrichCertificate(cert: any) {
    if (!cert) return cert;

    const metadata = (cert.metadata as Record<string, any> | null) || {};
    let userName = metadata.userName || metadata.fullName || metadata.name || null;
    let userEmail = metadata.userEmail || metadata.email || null;
    const courseName = metadata.courseName || metadata.programName || metadata.course || null;

    if (cert.userId && (!userName || !userEmail)) {
      const user = await this.prisma.user.findUnique({
        where: { id: cert.userId },
        select: { fullName: true, email: true },
      });
      if (!userName) userName = user?.fullName || null;
      if (!userEmail) userEmail = user?.email || null;
    }

    const personality = await this.resolvePersonalityData({
      userId: cert.userId,
      testResultId: cert.testResultId,
      metadata,
    });
    const verificationUrl = this.buildCertificateVerificationUrl(cert.certificateNumber);
    const qrCodeDataUrl = verificationUrl
      ? await buildCertificateQrCodeDataUrl(verificationUrl)
      : null;
    const secondaryLogoUrl = await this.ensurePngUploadVariant(metadata.secondaryLogoUrl || null);

    const templateSnapshot = this.stripSecondaryLogoFromTemplate(this.safeObject(metadata.templateSnapshot));

    return {
      ...cert,
      _id: cert.id,
      id: cert.id,
      certType: String(cert.certType || '').toLowerCase(),
      userName,
      userEmail,
      courseName,
      personalityCode: personality.personalityCode,
      personalityType: personality.personalityType,
      personalityData: personality.personalityData,
      verificationUrl,
      qrCodeDataUrl,
      secondaryLogoUrl,
      templateSnapshot,
      yayasan: {
        ...this.safeObject(metadata.yayasan),
        ...(secondaryLogoUrl ? { logoUrl: secondaryLogoUrl } : {}),
      },
    };
  }

  private buildCertificateVerificationUrl(certificateNumber?: string | null) {
    const normalized = String(certificateNumber || '').trim();
    if (!normalized) return null;
    return buildPublicFrontendUrl('/certificate/verify', {
      certificateNumber: normalized,
    });
  }

  private restoreSecondaryLogoToTemplate(template: any, secondaryLogoUrl?: string | null) {
    const resolvedTemplate = this.safeObject(template);
    const resolvedSecondaryLogoUrl = String(secondaryLogoUrl || '').trim();
    if (!resolvedSecondaryLogoUrl) {
      return resolvedTemplate;
    }

    return {
      ...resolvedTemplate,
      secondaryLogoUrl: resolvedSecondaryLogoUrl,
      logoUrl: resolvedSecondaryLogoUrl,
    };
  }

  private formatIssuedDate(value?: Date | string | null) {
    if (!value) return new Date().toLocaleDateString('id-ID');
    return new Date(value).toLocaleDateString('id-ID');
  }

  private async resolveYayasanContext(targetUser: any) {
    const targetExtra = this.safeObject(targetUser?.profile?.extra);
    const yayasanId = String(targetExtra.yayasanId || '').trim();
    const yayasanCode = String(targetExtra.yayasanReferralCode || targetUser?.referredByCode || '').trim();

    const yayasan = yayasanId
      ? await this.prisma.user.findUnique({
          where: { id: yayasanId },
          include: { profile: true, yayasanProfile: true },
        })
      : yayasanCode
        ? await this.prisma.user.findFirst({
            where: { role: Role.YAYASAN, myReferralCode: yayasanCode },
            include: { profile: true, yayasanProfile: true },
          })
        : null;

    const yayasanExtra = this.safeObject(yayasan?.profile?.extra);
    return {
      id: yayasan?.id || null,
      name: yayasan?.yayasanProfile?.institutionName || yayasan?.fullName || null,
      email: yayasan?.email || null,
      referralCode: yayasan?.myReferralCode || null,
      logoUrl: String(yayasanExtra.yayasanLogoUrl || '').trim() || null,
    };
  }

  private async buildCertificatePdf(cert: any) {
    return this.certificatePdfCacheService.getOrCreatePdf(cert);
  }

  private sendPdf(response: Response, fileName: string, payload: Buffer) {
    response.status(200);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.setHeader('Content-Transfer-Encoding', 'binary');
    response.setHeader('Content-Length', String(payload.length));
    response.send(payload);
  }

  private buildCertificateIdSuffix(userId: string, attempt = 0) {
    const seed = `${String(userId || '').trim()}:${attempt}`;
    const digest = createHash('sha256').update(seed).digest();
    const digits = Array.from(digest.slice(0, 6)).map((value) => String(value % 10)).join('');
    return `U${digits}`;
  }

  private async generateCertificateNumber(userId: string, excludeCertificateId?: string | null) {
    const year = new Date().getFullYear();
    const prefix = 'NMC';

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const candidate = `${prefix}-${year}-${this.buildCertificateIdSuffix(userId, attempt)}`;
      const existing = await this.prisma.issuedCertificate.findUnique({
        where: { certificateNumber: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === excludeCertificateId) {
        return candidate;
      }
    }

    throw new BadRequestException('Gagal membuat nomor sertifikat yang unik.');
  }

  private async assertCertificateAccess(currentUser: any, userId: string) {
    const isAdminActor =
      currentUser && [Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR, Role.DEVELOPER].includes(currentUser.role);
    const isSelfOrAdmin = currentUser.sub === userId || isAdminActor;

    if (isAdminActor) {
      await this.adminRbacService.assertPermission(currentUser.sub, 'certificates.view');
    }

    if (!isSelfOrAdmin && currentUser.role === Role.YAYASAN) {
      const yayasan = await this.prisma.user.findUnique({
        where: { id: currentUser.sub },
        select: { myReferralCode: true },
      });
      const targetUserScope = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { referredByCode: true },
      });

      if (!yayasan?.myReferralCode || targetUserScope?.referredByCode !== yayasan.myReferralCode) {
        throw new ForbiddenException('Insufficient role');
      }
      return;
    }

    if (!isSelfOrAdmin) {
      throw new ForbiddenException('Insufficient role');
    }
  }

  private async getTemplateSnapshot(certType: CertificateType, secondaryLogoUrl?: string | null) {
    await ensureDemoCertificateTemplate(this.prisma, certType);
    const templateRow = await this.prisma.certificateTemplate.findUnique({
      where: { certType },
    });
    const template = this.stripSecondaryLogoFromTemplate(await mapCertificateTemplateForClient(this.prisma, templateRow));
    return secondaryLogoUrl ? { ...template, secondaryLogoUrl, logoUrl: secondaryLogoUrl } : template;
  }

  private async buildCertificateSnapshot(input: {
    userId: string;
    certType: CertificateType;
    latestResult?: any;
    courseName?: string | null;
  }) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        referredByCode: true,
        myReferralCode: true,
        role: true,
        profile: {
          select: {
            extra: true,
          },
        },
      },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const personality = await this.resolvePersonalityData({
      userId: input.userId,
      testResultId: input.latestResult?.id || null,
    });
    const yayasan = input.certType === CertificateType.YAYASAN
      ? await this.resolveYayasanContext(targetUser)
      : null;
    const templateSnapshot = await this.getTemplateSnapshot(input.certType, yayasan?.logoUrl || null);

    return {
      targetUser,
      personality,
      yayasan,
      templateSnapshot,
      metadata: {
        userName: targetUser.fullName,
        userEmail: targetUser.email,
        courseName: input.courseName || 'NEWME Personality Assessment',
        personalityCode: personality.personalityCode,
        personalityType: personality.personalityType,
        personalityData: personality.personalityData,
        certType: String(input.certType).toLowerCase(),
        secondaryLogoUrl: yayasan?.logoUrl || null,
        yayasan: yayasan || null,
        templateSnapshot,
      },
    };
  }

  private async resolveCertificateSourceData(userId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        myReferralCode: true,
        referredByCode: true,
        role: true,
        profile: {
          select: {
            extra: true,
          },
        },
      },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const latestResult = await this.findLatestCertificateResult(userId, true);
    const targetExtra = this.safeObject(targetUser.profile?.extra);
    const latestResultExtra = this.safeObject((latestResult as any)?.user?.profile?.extra);
    const resolvedCertType =
      targetExtra.isYayasanLinked || latestResultExtra.isYayasanLinked
        ? CertificateType.YAYASAN
        : CertificateType.INDIVIDU;
    const snapshot = await this.buildCertificateSnapshot({
      userId,
      certType: resolvedCertType,
      latestResult,
      courseName: 'NEWME Personality Assessment',
    });

    return {
      latestResult,
      resolvedCertType,
      ...snapshot,
    };
  }

  private async getCertificateSourceData(userId: string) {
    const source = await this.resolveCertificateSourceData(userId);

    let cert = await this.prisma.issuedCertificate.findFirst({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    if (cert && cert.certType !== source.resolvedCertType) {
      cert = await this.prisma.issuedCertificate.update({
        where: { id: cert.id },
        data: {
          certType: source.resolvedCertType,
          metadata: {
            ...this.safeObject(cert.metadata),
            ...source.metadata,
          },
        },
      });
    }

    if (!cert) {
      const certificateNumber = await this.generateCertificateNumber(userId);
      cert = await this.prisma.issuedCertificate.create({
        data: {
          certificateNumber,
          userId,
          certType: source.resolvedCertType,
          testResultId: source.latestResult?.id || null,
          metadata: source.metadata,
        },
      });
    }

    return {
      ...source,
      cert,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.view')
  @Get('template')
  async getTemplate(@Query('certType') certType?: string) {
    const resolvedType = this.toCertificateType(certType);
    await ensureDemoCertificateTemplate(this.prisma, resolvedType);
    const row = await this.prisma.certificateTemplate.findUnique({
      where: { certType: resolvedType },
    });
    return this.stripSecondaryLogoFromTemplate(await mapCertificateTemplateForClient(this.prisma, row));
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.edit')
  @Put('template')
  async updateTemplate(@CurrentUser() user: any, @Req() req: Request, @Body() body: any) {
    const resolvedType = this.toCertificateType(body.certType);
    await ensureDemoCertificateTemplate(this.prisma, resolvedType);
    const before = await this.prisma.certificateTemplate.findUnique({
      where: { certType: resolvedType },
    });
    const payload = serializeCertificateTemplateForStorage(resolvedType, body || {});
    const metadata = buildCertificateTemplateMetadata(resolvedType, body || {});
    const updated = await this.prisma.certificateTemplate.upsert({
      where: { certType: resolvedType },
      create: payload,
      update: payload,
    });
    await this.prisma.setting.upsert({
      where: { key: `certificate-template:${String(resolvedType).toLowerCase()}` },
      update: { value: metadata as any },
      create: {
        key: `certificate-template:${String(resolvedType).toLowerCase()}`,
        value: metadata as any,
      },
    });
    const mapped = this.stripSecondaryLogoFromTemplate(await mapCertificateTemplateForClient(this.prisma, updated));
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_CERTIFICATE_TEMPLATE_UPDATED',
      category: 'testing',
      targetType: 'certificate_template',
      targetId: String(resolvedType).toLowerCase(),
      targetLabel: `Template ${String(resolvedType).toLowerCase()}`,
      summary: `Template sertifikat ${String(resolvedType).toLowerCase()} diperbarui.`,
      before: before ? {
        certType: String(before.certType).toLowerCase(),
      } : null,
      after: {
        certType: mapped?.certType || String(resolvedType).toLowerCase(),
        title: mapped?.title || null,
      },
      ipAddress: req?.ip,
    });
    return mapped;
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.manage')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        const dir = resolve(process.cwd(), 'uploads', 'certificates');
        mkdirSync(dir, { recursive: true });
        callback(null, dir);
      },
      filename: (req, file, callback) => {
        const assetType = String(req.params.assetType || 'asset')
          .replace(/[^a-z0-9_-]/gi, '')
          .toLowerCase() || 'asset';
        const extension = extname(file.originalname || '') || '.png';
        callback(null, `${assetType}-${Date.now()}${extension}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, file.mimetype.startsWith('image/'));
    },
  }))
  @Post('template/upload/:assetType')
  uploadAsset(
    @CurrentUser() user: any,
    @Param('assetType') assetType: string,
    @UploadedFile() file: any,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File gambar wajib diunggah');
    }

    const result = {
      assetType,
      url: this.publicUploadUrl(request, file.filename),
    };
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_CERTIFICATE_ASSET_UPLOADED',
      category: 'testing',
      targetType: 'certificate_asset',
      targetId: assetType,
      targetLabel: assetType,
      summary: `Aset sertifikat ${assetType} diunggah.`,
      after: {
        type: assetType,
        imageUrl: result.url,
      },
      ipAddress: request?.ip,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.view')
  @Get('eligible')
  async eligible() {
    const latestResults = await this.prisma.testResult.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            myReferralCode: true,
            referredByCode: true,
            role: true,
            profile: {
              select: {
                extra: true,
              },
            },
          },
        },
      },
    });
    const seenUserIds = new Set<string>();

    const items = await Promise.all(latestResults
      .filter((row) => {
        const userId = String(row.userId || '').trim();
        if (!userId || seenUserIds.has(userId)) return false;
        seenUserIds.add(userId);
        return true;
      })
      .filter((row) => row.user?.role === Role.USER)
      .map(async (row) => {
        const targetExtra = this.safeObject(row.user?.profile?.extra);
        const resultUserExtra = this.safeObject((row as any)?.user?.profile?.extra);
        const resolvedCertType = targetExtra.isYayasanLinked || resultUserExtra.isYayasanLinked
          ? CertificateType.YAYASAN
          : CertificateType.INDIVIDU;
        const yayasan = resolvedCertType === CertificateType.YAYASAN
          ? await this.resolveYayasanContext(row.user)
          : null;

        return {
          userId: row.userId,
          userName: row.user?.fullName || 'Tanpa Nama',
          userEmail: row.user?.email || null,
          resolvedCertType: String(resolvedCertType).toLowerCase(),
          latestTestResultId: row.id,
          latestTestType: row.testType,
          yayasanId: yayasan?.id || null,
          yayasanName: yayasan?.name || null,
          yayasanLogoUrl: yayasan?.logoUrl || null,
          yayasanLogoAvailable: Boolean(yayasan?.logoUrl),
        };
      }));

    return items.sort((left, right) => String(left.userName || '').localeCompare(String(right.userName || '')));
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.view')
  @Get('issued')
  async issued(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const rows = await this.prisma.issuedCertificate.findMany({ orderBy: { issuedAt: 'desc' } });
    const enriched = await Promise.all(rows.map((row) => this.enrichCertificate(row)));
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const filtered = normalizedSearch
      ? enriched.filter((row) => `${row?.certificateNumber || ''} ${row?.userName || ''} ${row?.userEmail || ''} ${row?.courseName || ''}`.toLowerCase().includes(normalizedSearch))
      : enriched;
    const safePage = Math.max(Number(page || 1), 1);
    const safePageSize = Math.min(Math.max(Number(pageSize || 10), 1), 100);
    const start = (safePage - 1) * safePageSize;
    return {
      items: filtered.slice(start, start + safePageSize),
      total: filtered.length,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(Math.ceil(filtered.length / safePageSize), 1),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.create')
  @Post('issue')
  async issue(@CurrentUser() user: any, @Req() req: Request, @Body() body: any) {
    if (!String(body.userId || '').trim()) {
      throw new BadRequestException('User wajib dipilih.');
    }

    const source = await this.resolveCertificateSourceData(String(body.userId));
    if (!source.latestResult) {
      throw new BadRequestException('User belum memiliki hasil test yang bisa dijadikan sertifikat.');
    }

    const certNo = await this.generateCertificateNumber(String(body.userId || ''));
    const created = await this.prisma.issuedCertificate.create({
      data: {
        certificateNumber: certNo,
        userId: body.userId || null,
        certType: source.resolvedCertType,
        testResultId: source.latestResult?.id || null,
        metadata: {
          ...source.metadata,
          issuedFromAdminDashboard: true,
          courseName: body.courseName || source.metadata.courseName || 'NEWME Personality Assessment',
        },
      },
    });
    const enriched = await this.enrichCertificate(created);
    void this.certificatePdfCacheService.queueWarmGeneration(enriched).catch(() => undefined);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_CERTIFICATE_ISSUED',
      category: 'testing',
      targetType: 'certificate_issue',
      targetId: enriched?.id || created.id,
      targetLabel: enriched?.certificateNumber || created.certificateNumber,
      summary: `Sertifikat ${enriched?.certificateNumber || created.certificateNumber} diterbitkan.`,
      after: {
        certificateNumber: enriched?.certificateNumber || created.certificateNumber,
        certType: enriched?.certType || String(source.resolvedCertType).toLowerCase(),
        userName: enriched?.userName || null,
        userEmail: enriched?.userEmail || null,
      },
      ipAddress: req?.ip,
    });
    return enriched;
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @AuthAudienceAccess(AuthAudience.ADMIN)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.view')
  @Get('detail/:id')
  async detail(@Param('id') id: string) {
    const cert = await this.prisma.issuedCertificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate not found');
    return this.enrichCertificate(cert);
  }

  @Get('verify/:certificateNumber')
  async verify(@Param('certificateNumber') certificateNumber: string) {
    const cert = await this.prisma.issuedCertificate.findUnique({ where: { certificateNumber } });
    if (!cert) return { valid: false, certificateNumber };
    const enriched = await this.enrichCertificate(cert);
    return { ...enriched, valid: true };
  }

  @UseGuards(JwtAuthGuard)
  @AuthAudienceAccess([AuthAudience.USER, AuthAudience.YAYASAN])
  @Get('check-eligibility')
  async eligibility(@CurrentUser() currentUser: any) {
    if (currentUser?.role !== Role.USER) {
      return { eligible: false };
    }

    try {
      const source = await this.resolveCertificateSourceData(String(currentUser?.sub || ''));
      return { eligible: Boolean(source.latestResult) };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { eligible: false };
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @AuthAudienceAccess([AuthAudience.USER, AuthAudience.YAYASAN, AuthAudience.ADMIN])
  @Get('preview-data/:userId')
  async previewData(@CurrentUser() currentUser: any, @Param('userId') userId: string) {
    await this.assertCertificateAccess(currentUser, userId);
    const { latestResult, cert, targetUser, templateSnapshot, yayasan } = await this.getCertificateSourceData(userId);

    if (!latestResult) {
      throw new NotFoundException('Test result not found');
    }

    const result = await mapTestResultForClient(this.prisma, latestResult);
    const enrichedCert = await this.enrichCertificate(cert);
    const template = enrichedCert.templateSnapshot && Object.keys(enrichedCert.templateSnapshot).length
      ? enrichedCert.templateSnapshot
      : templateSnapshot;

    return {
      certificateNumber: enrichedCert.certificateNumber,
      issuedAt: enrichedCert.issuedAt,
      courseName: enrichedCert.courseName || 'NEWME Personality Assessment',
      certType: enrichedCert.certType,
      verificationUrl: enrichedCert.verificationUrl || null,
      qrCodeDataUrl: enrichedCert.qrCodeDataUrl || null,
      userId: targetUser.id,
      userName: targetUser.fullName,
      userEmail: targetUser.email,
      memberCode:
        this.safeObject(targetUser.profile?.extra).memberCode
        || this.safeObject(targetUser.profile?.extra).publicCode
        || targetUser.myReferralCode
        || null,
      yayasan,
      template: this.restoreSecondaryLogoToTemplate(template, enrichedCert.secondaryLogoUrl || yayasan?.logoUrl || null),
      result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: CERT_AI_DOWNLOAD_RATE_LIMIT, ttl: CERT_DOWNLOAD_RATE_LIMIT_TTL_MS } })
  @Get('download-ai-certificate')
  downloadAi(@Res() response: Response) {
    const payload = buildSimplePdf([
      'NEWME AI CERTIFICATE',
      'Issued for benchmark and frontend validation',
      `Generated At: ${new Date().toLocaleString('id-ID')}`,
    ]);
    this.sendPdf(response, 'newme-ai-certificate.pdf', payload);
  }

  @Throttle({ default: { limit: CERT_DOWNLOAD_RATE_LIMIT, ttl: CERT_DOWNLOAD_RATE_LIMIT_TTL_MS } })
  @Get('download/:certificateNumber')
  async download(@Param('certificateNumber') certificateNumber: string, @Res() response: Response) {
    const cert = await this.prisma.issuedCertificate.findUnique({ where: { certificateNumber } });
    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }

    const enriched = await this.enrichCertificate(cert);
    this.sendPdf(response, `${certificateNumber}.pdf`, await this.buildCertificatePdf(enriched));
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: CERT_GENERATE_RATE_LIMIT, ttl: CERT_DOWNLOAD_RATE_LIMIT_TTL_MS } })
  @AuthAudienceAccess([AuthAudience.USER, AuthAudience.YAYASAN, AuthAudience.ADMIN])
  @Get('generate-newme/:userId')
  async generateNewme(@CurrentUser() currentUser: any, @Param('userId') userId: string, @Res() response: Response) {
    await this.assertCertificateAccess(currentUser, userId);
    const { cert, targetUser } = await this.getCertificateSourceData(userId);

    const enriched = await this.enrichCertificate(cert);
    this.sendPdf(response, `newme-${targetUser.id}.pdf`, await this.buildCertificatePdf(enriched));
  }
}
