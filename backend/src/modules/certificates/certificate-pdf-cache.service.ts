import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { buildVisualCertificatePdf } from 'src/common/utils/certificate-pdf';
import { QueueEvents } from 'bullmq';

const CERTIFICATE_PDF_QUEUE_NAME = 'certificate-pdf';
const CERTIFICATE_PDF_JOB_NAME = 'certificate-pdf.generate';
const CERTIFICATE_PDF_WAIT_TIMEOUT_MS = Number(process.env.CERTIFICATE_PDF_WAIT_TIMEOUT_MS || 30000);
const CERTIFICATE_PDF_RENDER_VERSION =
  String(process.env.CERTIFICATE_PDF_RENDER_VERSION || '2026-04-04-11').trim() || '2026-04-04-11';

@Injectable()
export class CertificatePdfCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CertificatePdfCacheService.name);
  private queueEvents: QueueEvents | null = null;

  constructor(
    @InjectQueue(CERTIFICATE_PDF_QUEUE_NAME) private readonly certificatePdfQueue: Queue,
  ) {}

  async onModuleInit() {
    this.queueEvents = new QueueEvents(CERTIFICATE_PDF_QUEUE_NAME, {
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
      },
      prefix: process.env.BULLMQ_PREFIX || 'newme',
    });
    await this.queueEvents.waitUntilReady();
  }

  async onModuleDestroy() {
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
  }

  async getOrCreatePdf(certificate: Record<string, any>) {
    const descriptor = await this.describeCache(certificate);
    const cached = await this.readCachedPdf(descriptor.cachePath);
    if (cached) {
      return cached;
    }

    return this.generateAndPersist(certificate, descriptor.cachePath);
  }

  async queueWarmGeneration(certificate: Record<string, any>) {
    const descriptor = await this.describeCache(certificate);
    const cached = await this.readCachedPdf(descriptor.cachePath);
    if (cached) {
      return descriptor.cachePath;
    }
    void this.generateAndPersist(certificate, descriptor.cachePath).catch((error: any) => {
      this.logger.warn(`Certificate PDF warm generation failed for ${descriptor.certificateNumber}: ${error?.message || 'generate_failed'}`);
    });
    return descriptor.cachePath;
  }

  async generateAndPersist(certificate: Record<string, any>, cachePath?: string) {
    const descriptor = cachePath
      ? { cachePath }
      : await this.describeCache(certificate);
    const targetPath = cachePath || descriptor.cachePath;

    const existing = await this.readCachedPdf(targetPath);
    if (existing) {
      return existing;
    }

    const payload = await buildVisualCertificatePdf(certificate);
    await mkdir(dirname(targetPath), { recursive: true });
    const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
    try {
      await writeFile(tempPath, payload);
      await rename(tempPath, targetPath);
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
    return readFile(targetPath);
  }

  private async findOrCreateJob(
    descriptor: { jobId: string; cachePath: string },
    certificate: Record<string, any>,
  ) {
    let job = (await this.certificatePdfQueue.getJob(descriptor.jobId)) || undefined;
    const state = job ? await job.getState() : null;

    if (job && ['completed', 'failed'].includes(String(state || '')) && !(await this.fileExists(descriptor.cachePath))) {
      await job.remove().catch(() => undefined);
      job = undefined;
    }

    if (!job) {
      job = await this.certificatePdfQueue.add(
        CERTIFICATE_PDF_JOB_NAME,
        {
          certificate,
          cachePath: descriptor.cachePath,
        },
        {
          jobId: descriptor.jobId,
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    }

    return job;
  }

  private async describeCache(certificate: Record<string, any>) {
    const certificateNumber = String(certificate?.certificateNumber || '').trim();
    const fingerprint = createHash('sha256')
      .update(this.stableStringify({
        renderVersion: CERTIFICATE_PDF_RENDER_VERSION,
        certificateNumber,
        certType: certificate?.certType || null,
        issuedAt: certificate?.issuedAt instanceof Date
          ? certificate.issuedAt.toISOString()
          : certificate?.issuedAt || null,
        metadata: certificate?.metadata || null,
        templateSnapshot: certificate?.templateSnapshot || null,
        personalityCode: certificate?.personalityCode || null,
        personalityType: certificate?.personalityType || null,
        secondaryLogoUrl: certificate?.secondaryLogoUrl || null,
      }))
      .digest('hex')
      .slice(0, 16);

    const safeNumber = certificateNumber.replace(/[^a-z0-9_-]/gi, '_') || 'certificate';
    const dir = resolve(process.cwd(), 'uploads', 'certificates', 'generated');
    await mkdir(dir, { recursive: true });

    return {
      certificateNumber,
      jobId: `${safeNumber}__${fingerprint}`,
      cachePath: resolve(dir, `${safeNumber}-${fingerprint}.pdf`),
    };
  }

  private stableStringify(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${this.stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }

  private async readCachedPdf(filePath: string) {
    try {
      const info = await stat(filePath);
      if (info.size > 0) {
        return await readFile(filePath);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async fileExists(filePath: string) {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
