import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CertificatePdfCacheService } from './certificate-pdf-cache.service';

const CERTIFICATE_PDF_QUEUE_CONCURRENCY = Number(process.env.CERTIFICATE_PDF_QUEUE_CONCURRENCY || 2);

@Processor('certificate-pdf', { concurrency: CERTIFICATE_PDF_QUEUE_CONCURRENCY })
export class CertificatePdfProcessor extends WorkerHost {
  constructor(
    private readonly certificatePdfCacheService: CertificatePdfCacheService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name !== 'certificate-pdf.generate') {
      return null;
    }

    return this.certificatePdfCacheService.generateAndPersist(job.data.certificate, job.data.cachePath);
  }
}
