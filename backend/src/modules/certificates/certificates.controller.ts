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
import { CertificateType, Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { mkdirSync } from 'fs';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
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
import { AdminRbacService } from '../admin-rbac/admin-rbac.service';
import { PrismaService } from '../prisma/prisma.service';

const CERT_DOWNLOAD_RATE_LIMIT_TTL_MS = Number(process.env.CERT_DOWNLOAD_RATE_LIMIT_TTL || 60) * 1000;
const CERT_DOWNLOAD_RATE_LIMIT = Number(process.env.CERT_DOWNLOAD_RATE_LIMIT || 30);
const CERT_AI_DOWNLOAD_RATE_LIMIT = Number(process.env.CERT_AI_DOWNLOAD_RATE_LIMIT || 20);
const CERT_GENERATE_RATE_LIMIT = Number(process.env.CERT_GENERATE_RATE_LIMIT || 15);

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminRbacService: AdminRbacService,
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
    };
  }

  private formatIssuedDate(value?: Date | string | null) {
    if (!value) return new Date().toLocaleDateString('id-ID');
    return new Date(value).toLocaleDateString('id-ID');
  }

  private buildCertificatePdf(cert: any) {
    const lines = [
      'NEWME DIGITAL CERTIFICATE',
      `Certificate Number: ${cert.certificateNumber || 'N/A'}`,
      `Name: ${cert.userName || cert.metadata?.userName || cert.metadata?.fullName || 'Peserta NEWME'}`,
      `Email: ${cert.userEmail || cert.metadata?.userEmail || cert.metadata?.email || '-'}`,
      `Program: ${cert.courseName || cert.metadata?.courseName || cert.metadata?.programName || cert.certType || 'NEWME Assessment'}`,
      `Personality: ${cert.personalityType || cert.metadata?.personalityType || '-'}`,
      `Issued At: ${this.formatIssuedDate(cert.issuedAt || cert.createdAt)}`,
      'Status: Valid',
    ];

    return buildSimplePdf(lines);
  }

  private sendPdf(response: Response, fileName: string, payload: Buffer) {
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.setHeader('Content-Length', payload.length);
    response.end(payload);
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

  private async getCertificateSourceData(userId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        myReferralCode: true,
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

    const personality = await this.resolvePersonalityData({
      userId,
      testResultId: latestResult?.id || null,
    });
    const targetExtra = this.safeObject(targetUser.profile?.extra);
    const latestResultExtra = this.safeObject((latestResult as any)?.user?.profile?.extra);
    const resolvedCertType =
      targetExtra.isYayasanLinked || latestResultExtra.isYayasanLinked
        ? CertificateType.YAYASAN
        : CertificateType.INDIVIDU;

    let cert = await this.prisma.issuedCertificate.findFirst({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    if (cert && cert.certType !== resolvedCertType) {
      cert = await this.prisma.issuedCertificate.update({
        where: { id: cert.id },
        data: { certType: resolvedCertType },
      });
    }

    if (!cert) {
      cert = await this.prisma.issuedCertificate.create({
        data: {
          certificateNumber: `${process.env.CERT_NUMBER_PREFIX || 'NEWME'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${targetUser.id.slice(-6).toUpperCase()}`,
          userId,
          certType: resolvedCertType,
          testResultId: latestResult?.id || null,
          metadata: {
            userName: targetUser.fullName,
            userEmail: targetUser.email,
            courseName: 'NEWME Personality Assessment',
            personalityCode: personality.personalityCode,
            personalityType: personality.personalityType,
            personalityData: personality.personalityData,
          },
        },
      });
    }

    return {
      targetUser,
      latestResult,
      cert,
      personality,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.view')
  @Get('template')
  async getTemplate(@Query('certType') certType?: string) {
    const resolvedType = this.toCertificateType(certType);
    await ensureDemoCertificateTemplate(this.prisma, resolvedType);
    const row = await this.prisma.certificateTemplate.findUnique({
      where: { certType: resolvedType },
    });
    return mapCertificateTemplateForClient(this.prisma, row);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.edit')
  @Put('template')
  async updateTemplate(@Body() body: any) {
    const resolvedType = this.toCertificateType(body.certType);
    await ensureDemoCertificateTemplate(this.prisma, resolvedType);
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
    return mapCertificateTemplateForClient(this.prisma, updated);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
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
    @Param('assetType') assetType: string,
    @UploadedFile() file: any,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File gambar wajib diunggah');
    }

    return {
      assetType,
      url: this.publicUploadUrl(request, file.filename),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
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
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('certificates.create')
  @Post('issue')
  async issue(@Body() body: any) {
    const certType = this.toCertificateType(body.certType);
    const user = body.userId
      ? await this.prisma.user.findUnique({
          where: { id: body.userId },
          select: { fullName: true, email: true },
        })
      : null;
    const latestResult = body.testResultId
      ? await this.prisma.testResult.findUnique({ where: { id: body.testResultId } })
      : body.userId
        ? await this.findLatestCertificateResult(body.userId)
        : null;
    const personality = await this.resolvePersonalityData({
      userId: body.userId || null,
      testResultId: body.testResultId || latestResult?.id || null,
      metadata: body,
    });
    const certNo = `${process.env.CERT_NUMBER_PREFIX || 'NEWME'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    const created = await this.prisma.issuedCertificate.create({
      data: {
        certificateNumber: certNo,
        userId: body.userId || null,
        certType,
        testResultId: body.testResultId || latestResult?.id || null,
        metadata: {
          ...body,
          userName: user?.fullName || body.userName || null,
          userEmail: user?.email || body.userEmail || null,
          courseName: body.courseName || 'NEWME Personality Assessment',
          personalityCode: personality.personalityCode,
          personalityType: personality.personalityType,
          personalityData: personality.personalityData,
        },
      },
    });
    return this.enrichCertificate(created);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
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
  @Get('check-eligibility')
  eligibility() {
    return { eligible: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('preview-data/:userId')
  async previewData(@CurrentUser() currentUser: any, @Param('userId') userId: string) {
    await this.assertCertificateAccess(currentUser, userId);
    const { latestResult, cert, targetUser } = await this.getCertificateSourceData(userId);

    if (!latestResult) {
      throw new NotFoundException('Test result not found');
    }

    const result = await mapTestResultForClient(this.prisma, latestResult);
    const enrichedCert = await this.enrichCertificate(cert);
    const templateRow = await this.prisma.certificateTemplate.findUnique({
      where: { certType: this.toCertificateType(enrichedCert.certType) },
    });
    const template = await mapCertificateTemplateForClient(this.prisma, templateRow);

    return {
      certificateNumber: enrichedCert.certificateNumber,
      issuedAt: enrichedCert.issuedAt,
      courseName: enrichedCert.courseName || 'NEWME Personality Assessment',
      certType: enrichedCert.certType,
      userId: targetUser.id,
      userName: targetUser.fullName,
      userEmail: targetUser.email,
      memberCode:
        this.safeObject(targetUser.profile?.extra).memberCode
        || this.safeObject(targetUser.profile?.extra).publicCode
        || targetUser.myReferralCode
        || null,
      template,
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
    this.sendPdf(response, `${certificateNumber}.pdf`, this.buildCertificatePdf(enriched));
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: CERT_GENERATE_RATE_LIMIT, ttl: CERT_DOWNLOAD_RATE_LIMIT_TTL_MS } })
  @Get('generate-newme/:userId')
  async generateNewme(@CurrentUser() currentUser: any, @Param('userId') userId: string, @Res() response: Response) {
    await this.assertCertificateAccess(currentUser, userId);
    const { cert, targetUser } = await this.getCertificateSourceData(userId);

    const enriched = await this.enrichCertificate(cert);
    this.sendPdf(response, `newme-${targetUser.id}.pdf`, this.buildCertificatePdf(enriched));
  }
}
