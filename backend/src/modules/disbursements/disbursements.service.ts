import { BadRequestException, Injectable } from '@nestjs/common';
import { DisbursementStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { encodeWithdrawalNotes, mapDisbursementForClient, parseWithdrawalNotes } from 'src/common/mappers/client-shapes';
import { PrismaService } from '../prisma/prisma.service';

type DisbursementProviderMode = 'manual' | 'mock' | 'midtrans_iris';

type CreateDisbursementInput = {
  type: string;
  userId?: string | null;
  amount: number;
  notes?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  accountName?: string | null;
};

type ProcessDisbursementInput = {
  status?: string;
  notes?: string | null;
  providerMode?: string | null;
};

@Injectable()
export class DisbursementsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeProviderMode(value?: string | null): DisbursementProviderMode {
    const normalized = String(value || process.env.DISBURSEMENT_PROVIDER || 'manual').trim().toLowerCase();
    if (normalized === 'midtrans_iris') return 'midtrans_iris';
    if (normalized === 'mock') return 'mock';
    return 'manual';
  }

  private isMidtransProduction() {
    return String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';
  }

  private getMidtransIrisBaseUrl() {
    const explicit = String(
      this.isMidtransProduction()
        ? process.env.MIDTRANS_IRIS_PRODUCTION_BASE_URL || ''
        : process.env.MIDTRANS_IRIS_SANDBOX_BASE_URL || '',
    ).trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    return this.isMidtransProduction()
      ? 'https://app.midtrans.com/iris/api/v1'
      : 'https://app.sandbox.midtrans.com/iris/api/v1';
  }

  private getMidtransIrisPayoutPath() {
    return String(process.env.MIDTRANS_IRIS_PAYOUTS_PATH || '/payouts').trim() || '/payouts';
  }

  private getMidtransIrisApiKey() {
    return String(
      (this.isMidtransProduction()
        ? process.env.MIDTRANS_IRIS_PRODUCTION_API_KEY
        : process.env.MIDTRANS_IRIS_SANDBOX_API_KEY)
      || process.env.MIDTRANS_IRIS_API_KEY
      || '',
    ).trim();
  }

  private buildProviderPayload(row: any, notes?: string | null) {
    const meta = parseWithdrawalNotes(notes ?? row?.notes);
    return {
      beneficiary_name: row?.accountName || meta.accountName || '',
      beneficiary_account: row?.bankAccount || meta.bankAccount || '',
      beneficiary_bank: row?.bankName || meta.bankName || '',
      amount: Number(row?.amount || 0),
      notes: meta.notes || undefined,
      reference_no: row?.id || randomUUID(),
    };
  }

  private inferProviderReference(payload: any) {
    return payload?.reference_no
      || payload?.referenceNo
      || payload?.reference
      || payload?.payout_id
      || payload?.payoutId
      || payload?.id
      || null;
  }

  private inferProviderStatus(payload: any) {
    const normalized = String(
      payload?.status
      || payload?.transaction_status
      || payload?.payout_status
      || payload?.state
      || '',
    ).trim().toLowerCase();
    if (!normalized) return 'submitted';
    return normalized;
  }

  private mapProviderStatusToDisbursementStatus(providerStatus: string) {
    const normalized = String(providerStatus || '').trim().toLowerCase();
    if (!normalized) return DisbursementStatus.PROCESSING;
    if (['completed', 'success', 'succeeded', 'approved', 'paid'].includes(normalized)) {
      return DisbursementStatus.APPROVED;
    }
    if (['failed', 'error'].includes(normalized)) {
      return DisbursementStatus.FAILED;
    }
    if (['rejected', 'cancelled', 'canceled'].includes(normalized)) {
      return DisbursementStatus.REJECTED;
    }
    return DisbursementStatus.PROCESSING;
  }

  private async submitMidtransIris(row: any, notes?: string | null) {
    const apiKey = this.getMidtransIrisApiKey();
    if (!apiKey) {
      throw new BadRequestException('MIDTRANS_IRIS API key belum dikonfigurasi.');
    }

    const payload = this.buildProviderPayload(row, notes);
    if (!payload.beneficiary_name || !payload.beneficiary_account || !payload.beneficiary_bank) {
      throw new BadRequestException('Data rekening payout belum lengkap.');
    }

    const response = await fetch(`${this.getMidtransIrisBaseUrl()}${this.getMidtransIrisPayoutPath()}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let responseBody: any = {};
    try {
      responseBody = rawText ? JSON.parse(rawText) : {};
    } catch {
      responseBody = { raw: rawText };
    }

    if (!response.ok) {
      const detail = responseBody?.error_messages?.join(', ')
        || responseBody?.message
        || responseBody?.status_message
        || 'Midtrans IRIS gagal memproses payout.';
      throw new BadRequestException(detail);
    }

    const providerStatus = this.inferProviderStatus(responseBody);
    return {
      providerReferenceId: this.inferProviderReference(responseBody),
      providerStatus,
      providerPayload: responseBody,
      status: this.mapProviderStatusToDisbursementStatus(providerStatus),
    };
  }

  private buildClientShape(row: any, extra: Record<string, any> = {}) {
    return mapDisbursementForClient(row, {
      ...extra,
      provider: row.provider,
      providerReferenceId: row.providerReferenceId,
      providerStatus: row.providerStatus,
      providerPayload: row.providerPayload,
      failureReason: row.failureReason,
      bankName: row.bankName,
      bankAccount: row.bankAccount,
      accountName: row.accountName,
      submittedAt: row.submittedAt,
      completedAt: row.completedAt,
    });
  }

  async createDisbursement(input: CreateDisbursementInput) {
    const amount = Math.max(Number(input.amount || 0), 0);
    if (!amount) {
      throw new BadRequestException('Jumlah payout belum valid.');
    }

    const created = await this.prisma.disbursement.create({
      data: {
        type: input.type,
        userId: input.userId || null,
        amount,
        status: DisbursementStatus.PENDING,
        provider: 'manual',
        providerStatus: 'pending_review',
        notes: encodeWithdrawalNotes({
          notes: input.notes || null,
          bankName: input.bankName || null,
          bankAccount: input.bankAccount || null,
          accountName: input.accountName || null,
        }),
        bankName: input.bankName || null,
        bankAccount: input.bankAccount || null,
        accountName: input.accountName || null,
      },
    });

    return this.buildClientShape(created, { type: input.type });
  }

  async processDisbursement(id: string, input: ProcessDisbursementInput, extra: Record<string, any> = {}) {
    const current = await this.prisma.disbursement.findUnique({ where: { id } });
    if (!current) {
      throw new BadRequestException('Disbursement not found');
    }

    const currentMeta = parseWithdrawalNotes(current.notes);
    const nextStatusRaw = String(input.status || 'APPROVED').trim().toUpperCase();
    if (nextStatusRaw === 'REJECTED') {
      const rejected = await this.prisma.disbursement.update({
        where: { id },
        data: {
          status: DisbursementStatus.REJECTED,
          provider: current.provider || 'manual',
          providerStatus: 'rejected_by_admin',
          failureReason: null,
          notes: encodeWithdrawalNotes({
            notes: input.notes ?? currentMeta.notes,
            bankName: current.bankName || currentMeta.bankName,
            bankAccount: current.bankAccount || currentMeta.bankAccount,
            accountName: current.accountName || currentMeta.accountName,
          }),
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });
      return this.buildClientShape(rejected, extra);
    }

    const providerMode = this.normalizeProviderMode(input.providerMode);
    const mergedNotes = encodeWithdrawalNotes({
      notes: input.notes ?? currentMeta.notes,
      bankName: current.bankName || currentMeta.bankName,
      bankAccount: current.bankAccount || currentMeta.bankAccount,
      accountName: current.accountName || currentMeta.accountName,
    });

    if (providerMode === 'manual') {
      const approved = await this.prisma.disbursement.update({
        where: { id },
        data: {
          status: DisbursementStatus.APPROVED,
          provider: 'manual',
          providerReferenceId: current.providerReferenceId || null,
          providerStatus: 'approved_manually',
          providerPayload: {
            source: 'admin.manual',
            processedAt: new Date().toISOString(),
          } as any,
          failureReason: null,
          notes: mergedNotes,
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });
      return this.buildClientShape(approved, extra);
    }

    if (providerMode === 'mock') {
      const reference = `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const approved = await this.prisma.disbursement.update({
        where: { id },
        data: {
          status: DisbursementStatus.APPROVED,
          provider: 'mock',
          providerReferenceId: reference,
          providerStatus: 'mock_success',
          providerPayload: {
            source: 'mock',
            reference,
            processedAt: new Date().toISOString(),
          } as any,
          failureReason: null,
          notes: mergedNotes,
          submittedAt: new Date(),
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });
      return this.buildClientShape(approved, extra);
    }

    try {
      const submitted = await this.submitMidtransIris(
        {
          ...current,
          bankName: current.bankName || currentMeta.bankName,
          bankAccount: current.bankAccount || currentMeta.bankAccount,
          accountName: current.accountName || currentMeta.accountName,
        },
        input.notes ?? currentMeta.notes,
      );

      const updated = await this.prisma.disbursement.update({
        where: { id },
        data: {
          status: submitted.status,
          provider: 'midtrans_iris',
          providerReferenceId: submitted.providerReferenceId,
          providerStatus: submitted.providerStatus,
          providerPayload: submitted.providerPayload as any,
          failureReason: submitted.status === DisbursementStatus.FAILED ? 'provider_failed' : null,
          notes: mergedNotes,
          submittedAt: new Date(),
          processedAt: submitted.status === DisbursementStatus.PROCESSING ? null : new Date(),
          completedAt: submitted.status === DisbursementStatus.APPROVED ? new Date() : null,
        },
      });
      return this.buildClientShape(updated, extra);
    } catch (error: any) {
      const failed = await this.prisma.disbursement.update({
        where: { id },
        data: {
          status: DisbursementStatus.FAILED,
          provider: 'midtrans_iris',
          providerStatus: 'failed',
          failureReason: error?.message || 'provider_failed',
          notes: mergedNotes,
          submittedAt: new Date(),
          processedAt: new Date(),
        },
      });
      throw new BadRequestException(error?.message || 'Midtrans IRIS gagal memproses payout.', {
        cause: this.buildClientShape(failed, extra),
      } as any);
    }
  }
}
