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
import {
  buildDisplayAnalysis,
  buildTemplateInsights,
} from 'src/common/personality-result-shape';
import { PrismaService } from '../prisma/prisma.service';

const CERT_DOWNLOAD_RATE_LIMIT_TTL_MS = Number(process.env.CERT_DOWNLOAD_RATE_LIMIT_TTL || 60) * 1000;
const CERT_DOWNLOAD_RATE_LIMIT = Number(process.env.CERT_DOWNLOAD_RATE_LIMIT || 30);
const CERT_AI_DOWNLOAD_RATE_LIMIT = Number(process.env.CERT_AI_DOWNLOAD_RATE_LIMIT || 20);
const CERT_GENERATE_RATE_LIMIT = Number(process.env.CERT_GENERATE_RATE_LIMIT || 15);

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly prisma: PrismaService) {}

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

  private publicUploadUrl(request: Request, fileName: string) {
    return `${request.protocol}://${request.get('host')}/uploads/certificates/${fileName}`;
  }

  private sanitizeFileSegment(value: string) {
    return value.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'asset';
  }

  private async findTemplateForResult(result: {
    personalityCode?: string | null;
    socialType?: string | null;
    dominantElement?: string | null;
  }) {
    await ensureDemoPersonalityTemplates(this.prisma);

    if (result.personalityCode) {
      const byCode = await this.prisma.personalityResultTemplate.findUnique({
        where: { code: result.personalityCode },
      });
      if (byCode) return byCode;
    }

    if (result.socialType && result.dominantElement) {
      const byElement = await this.prisma.personalityResultTemplate.findFirst({
        where: {
          socialType: result.socialType,
          element: result.dominantElement.toLowerCase(),
        },
      });
      if (byElement) return byElement;
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
    if (Object.keys(existingData).length) {
      return {
        personalityCode: metadata.personalityCode || existingData.code || null,
        personalityType:
          metadata.personalityType
          || existingData.personalityType
          || existingData.personalityLabel
          || null,
        personalityData: existingData,
      };
    }

    const result = input.testResultId
      ? await this.prisma.testResult.findUnique({
          where: { id: input.testResultId },
        })
      : input.userId
        ? await this.prisma.testResult.findFirst({
            where: { userId: input.userId },
            orderBy: { createdAt: 'desc' },
          })
        : null;

    if (!result) {
      return {
        personalityCode: metadata.personalityCode || null,
        personalityType: metadata.personalityType || null,
        personalityData: null,
      };
    }

    const template = await this.findTemplateForResult(result);
    const displayAnalysis = buildDisplayAnalysis(
      template,
      result.normalizedScores || result.elementScores,
      result.personalityCode || 'Hasil Kepribadian',
    );
    const insights = buildTemplateInsights(template, result.personalityCode || undefined) as Record<string, any>;

    return {
      personalityCode: result.personalityCode || insights.code || null,
      personalityType: displayAnalysis.personalityType,
      personalityData: {
        code: result.personalityCode || insights.code || null,
        personalityType: displayAnalysis.personalityType,
        personalityLabel: insights.personalityLabel || displayAnalysis.personalityType,
        dominantElement: result.dominantElement || null,
        summary: displayAnalysis.summary,
        elementDescription: insights.elementDescription || [],
        karakter: insights.karakter || [],
        ciriKhas: insights.ciriKhas || [],
        rekomendasiKarir: insights.rekomendasiKarir || insights.dibutuhkanPadaProfesi || '',
        kekuatanJatidiri: insights.kekuatanJatidiri || {},
        kompilasiAdaptasi: insights.kompilasiAdaptasi || {},
        elementScores: displayAnalysis.elementScores,
      },
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('template')
  async getTemplate(@Query('certType') certType?: string) {
    const resolvedType = this.toCertificateType(certType);
    await ensureDemoCertificateTemplate(this.prisma, resolvedType);
    const row = await this.prisma.certificateTemplate.findUnique({
      where: { certType: resolvedType },
    });
    return mapCertificateTemplateForClient(this.prisma, row);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('issued')
  async issued() {
    const rows = await this.prisma.issuedCertificate.findMany({ orderBy: { issuedAt: 'desc' } });
    return Promise.all(rows.map((row) => this.enrichCertificate(row)));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
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
        ? await this.prisma.testResult.findFirst({
            where: { userId: body.userId },
            orderBy: { createdAt: 'desc' },
          })
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
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
    const isSelfOrAdmin =
      currentUser.sub === userId || [Role.ADMIN, Role.SUPERADMIN].includes(currentUser.role);

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
    } else if (!isSelfOrAdmin) {
      throw new ForbiddenException('Insufficient role');
    }
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const latestResult = await this.prisma.testResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const personality = await this.resolvePersonalityData({
      userId,
      testResultId: latestResult?.id || null,
    });

    const existing = await this.prisma.issuedCertificate.findFirst({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });
    const cert = existing || await this.prisma.issuedCertificate.create({
      data: {
        certificateNumber: `${process.env.CERT_NUMBER_PREFIX || 'NEWME'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${targetUser.id.slice(-6).toUpperCase()}`,
        userId,
        certType: 'INDIVIDU',
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

    const enriched = await this.enrichCertificate(cert);
    this.sendPdf(response, `newme-${targetUser.id}.pdf`, this.buildCertificatePdf(enriched));
  }
}
