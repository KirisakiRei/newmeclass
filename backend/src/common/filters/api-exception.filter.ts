import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorPresentation = {
  code: string;
  detail: string;
  messages?: string[];
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttpException ? exception.getResponse() : null;

    const normalized = this.normalizeException(status, payload, exception);

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    }

    response.status(status).json({
      success: false,
      error: normalized.code,
      message: this.getStatusLabel(status),
      detail: normalized.detail,
      statusCode: status,
      messages: normalized.messages,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalizeException(status: number, payload: unknown, exception: unknown): ErrorPresentation {
    const messages = this.extractMessages(payload, exception);
    const firstMessage = messages[0] || this.getStatusLabel(status);
    const lowerMessage = firstMessage.toLowerCase();

    if (status === HttpStatus.CONFLICT && lowerMessage.includes('email already registered')) {
      return {
        code: 'AUTH_EMAIL_ALREADY_REGISTERED',
        detail: 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.',
        messages,
      };
    }

    if (status === HttpStatus.CONFLICT && (lowerMessage.includes('phone') || lowerMessage.includes('whatsapp'))) {
      return {
        code: 'AUTH_PHONE_ALREADY_REGISTERED',
        detail: 'Nomor WhatsApp ini sudah terdaftar. Gunakan nomor lain atau masuk ke akun yang sudah ada.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('invalid credentials')) {
      return {
        code: 'AUTH_INVALID_CREDENTIALS',
        detail: 'Email atau password tidak sesuai.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('missing bearer token')) {
      return {
        code: 'AUTH_MISSING_TOKEN',
        detail: 'Sesi login tidak ditemukan. Silakan masuk kembali.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('invalid token')) {
      return {
        code: 'AUTH_INVALID_TOKEN',
        detail: 'Sesi login tidak valid atau sudah berakhir. Silakan masuk kembali.',
        messages,
      };
    }

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('premium access required')) {
      return {
        code: 'TEST_PREMIUM_ACCESS_REQUIRED',
        detail: 'Akses premium belum aktif. Selesaikan pembayaran terlebih dahulu.',
        messages,
      };
    }

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('insufficient role')) {
      return {
        code: 'AUTH_INSUFFICIENT_ROLE',
        detail: 'Anda tidak memiliki izin untuk mengakses fitur ini.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('insufficient balance')) {
      return {
        code: 'WALLET_INSUFFICIENT_BALANCE',
        detail: 'Saldo wallet tidak mencukupi untuk melanjutkan pembayaran.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('insufficient yayasan wallet balance')) {
      return {
        code: 'YAYASAN_WALLET_INSUFFICIENT_BALANCE',
        detail: 'Saldo yayasan tidak mencukupi untuk mengajukan penarikan.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('insufficient mitra wallet balance')) {
      return {
        code: 'MITRA_WALLET_INSUFFICIENT_BALANCE',
        detail: 'Saldo mitra tidak mencukupi untuk mengajukan penarikan.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('referral code not found')) {
      return {
        code: 'REFERRAL_CODE_NOT_FOUND',
        detail: 'Kode referral tidak ditemukan atau sudah tidak aktif.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('referral owner is not active')) {
      return {
        code: 'REFERRAL_CODE_INACTIVE',
        detail: 'Kode referral tidak aktif atau belum bisa digunakan.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('yayasan registration requires an active mitra referral code')) {
      return {
        code: 'YAYASAN_INVALID_MITRA_REFERRAL',
        detail: 'Pendaftaran yayasan hanya bisa menggunakan kode referral mitra yang aktif.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('user registration cannot use a mitra referral code directly')) {
      return {
        code: 'USER_INVALID_MITRA_REFERRAL',
        detail: 'Pengguna umum tidak bisa memakai kode mitra secara langsung. Gunakan link referral yayasan atau pengguna.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('mitra share and yayasan share must total 150000')) {
      return {
        code: 'MITRA_PRICE_SPLIT_INVALID',
        detail: 'Pembagian komisi mitra dan yayasan harus berjumlah Rp 150.000.',
        messages,
      };
    }

    if (status === HttpStatus.NOT_FOUND && lowerMessage.includes('certificate')) {
      return {
        code: 'CERTIFICATE_NOT_FOUND',
        detail: 'Sertifikat tidak ditemukan.',
        messages,
      };
    }

    if (status === HttpStatus.NOT_FOUND && lowerMessage.includes('user not found')) {
      return {
        code: 'USER_NOT_FOUND',
        detail: 'Data pengguna tidak ditemukan.',
        messages,
      };
    }

    if (status === HttpStatus.NOT_FOUND && lowerMessage.includes('result not found')) {
      return {
        code: 'TEST_RESULT_NOT_FOUND',
        detail: 'Hasil tes tidak ditemukan.',
        messages,
      };
    }

    if (status === HttpStatus.NOT_FOUND && lowerMessage.includes('personality code not found')) {
      return {
        code: 'PERSONALITY_RESULT_NOT_FOUND',
        detail: 'Hasil analisis kepribadian tidak ditemukan.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('validation failed')) {
      return {
        code: 'VALIDATION_ERROR',
        detail: 'Data yang dikirim belum sesuai. Periksa kembali input Anda.',
        messages,
      };
    }

    if (
      status === HttpStatus.BAD_REQUEST &&
      (lowerMessage.includes('in json at position') || lowerMessage.includes('unexpected token'))
    ) {
      return {
        code: 'REQUEST_INVALID_JSON',
        detail: 'Format data permintaan tidak valid. Silakan muat ulang halaman dan coba lagi.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && messages.length > 1) {
      return {
        code: 'VALIDATION_ERROR',
        detail: this.normalizeValidationMessage(messages[0]),
        messages,
      };
    }

    if (
      status === HttpStatus.INTERNAL_SERVER_ERROR &&
      lowerMessage.includes('could not convert argument value') &&
      lowerMessage.includes('datetime')
    ) {
      return {
        code: 'REQUEST_INVALID_DATE',
        detail: 'Format tanggal yang dikirim tidak valid. Silakan periksa kembali tanggal lahir Anda.',
        messages,
      };
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        detail: 'Terlalu banyak percobaan. Silakan tunggu sebentar lalu coba lagi.',
        messages,
      };
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        detail: 'Terjadi gangguan pada server. Silakan coba lagi dalam beberapa saat.',
      };
    }

    return {
      code: this.toErrorCode(status, firstMessage),
      detail: status === HttpStatus.BAD_REQUEST ? this.normalizeValidationMessage(firstMessage) : firstMessage,
      messages,
    };
  }

  private normalizeValidationMessage(message: string) {
    const normalized = message.trim();

    if (normalized.toLowerCase().includes('must be an email')) {
      return 'Format email belum valid.';
    }

    if (normalized.toLowerCase().includes('must be longer than or equal to')) {
      return 'Panjang data yang dimasukkan belum memenuhi syarat minimum.';
    }

    if (normalized.toLowerCase().includes('birthdate must be a valid date in yyyy-mm-dd format')) {
      return 'Format tanggal lahir harus YYYY-MM-DD.';
    }

    if (normalized.toLowerCase().includes('birthdate must be a realistic date')) {
      return 'Tanggal lahir yang dimasukkan di luar batas yang wajar.';
    }

    if (normalized.toLowerCase().includes('birthdate must be a valid calendar date')) {
      return 'Tanggal lahir yang dimasukkan tidak valid.';
    }

    if (normalized.toLowerCase().includes('should not be empty')) {
      return 'Masih ada data wajib yang belum diisi.';
    }

    return normalized;
  }

  private extractMessages(payload: unknown, exception: unknown) {
    if (typeof payload === 'string') {
      return [payload];
    }

    if (payload && typeof payload === 'object') {
      const message = (payload as Record<string, unknown>).message;
      if (Array.isArray(message)) {
        return message.map((item) => String(item));
      }
      if (typeof message === 'string') {
        return [message];
      }
    }

    if (exception instanceof Error && exception.message) {
      return [exception.message];
    }

    return ['Terjadi kesalahan yang tidak diketahui.'];
  }

  private toErrorCode(status: number, message: string) {
    const normalized = message
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
    return `${this.getStatusLabel(status).replace(/\s+/g, '_').toUpperCase()}_${normalized || 'ERROR'}`;
  }

  private getStatusLabel(status: number) {
    return HttpStatus[status] || 'Error';
  }
}
