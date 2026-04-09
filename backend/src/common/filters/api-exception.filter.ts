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

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('registration_otp_attempts_exceeded')) {
      return {
        code: 'REGISTRATION_OTP_ATTEMPTS_EXCEEDED',
        detail: 'Percobaan OTP sudah melebihi batas. Silakan kirim ulang OTP dan coba lagi.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('registration_otp_expired')) {
      return {
        code: 'REGISTRATION_OTP_EXPIRED',
        detail: 'Kode OTP sudah kedaluwarsa. Silakan kirim ulang OTP.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('registration_otp_invalid')) {
      return {
        code: 'REGISTRATION_OTP_INVALID',
        detail: 'Kode OTP belum sesuai. Periksa kembali 6 digit OTP Anda.',
        messages,
      };
    }

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('registration_otp_resend_cooldown')) {
      return {
        code: 'REGISTRATION_OTP_RESEND_COOLDOWN',
        detail: 'Permintaan OTP terlalu cepat. Tunggu beberapa detik lalu kirim ulang.',
        messages,
      };
    }

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('registration_email_not_verified')) {
      return {
        code: 'REGISTRATION_EMAIL_NOT_VERIFIED',
        detail: 'Email belum terverifikasi. Selesaikan verifikasi OTP terlebih dahulu.',
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

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('auth_provider_mismatch_google_only')) {
      return {
        code: 'AUTH_PROVIDER_MISMATCH_GOOGLE_ONLY',
        detail: 'Akun ini terdaftar dengan Google. Silakan masuk menggunakan Google.',
        messages,
      };
    }

    if (
      (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.CONFLICT || status === HttpStatus.BAD_REQUEST)
      && lowerMessage.includes('auth_provider_mismatch_manual_only')
    ) {
      return {
        code: 'AUTH_PROVIDER_MISMATCH_MANUAL_ONLY',
        detail: 'Email ini terdaftar dengan email dan password. Silakan masuk menggunakan metode tersebut.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('auth_google_email_unverified')) {
      return {
        code: 'AUTH_GOOGLE_EMAIL_UNVERIFIED',
        detail: 'Email Google Anda belum terverifikasi. Verifikasi email Google terlebih dahulu.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('auth_oauth_state_invalid')) {
      return {
        code: 'AUTH_OAUTH_STATE_INVALID',
        detail: 'Sesi login Google tidak valid atau sudah kedaluwarsa. Silakan coba lagi.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('auth_refresh_invalid')) {
      return {
        code: 'AUTH_REFRESH_INVALID',
        detail: 'Sesi login tidak dapat diperpanjang. Silakan masuk kembali.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('invalid session')) {
      return {
        code: 'AUTH_SESSION_INVALID',
        detail: 'Sesi login tidak valid. Silakan masuk kembali.',
        messages,
      };
    }

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('session expired')) {
      return {
        code: 'AUTH_SESSION_EXPIRED',
        detail: 'Sesi login sudah berakhir. Silakan masuk kembali.',
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

    if (status === HttpStatus.UNAUTHORIZED && lowerMessage.includes('password_reset_token_invalid')) {
      return {
        code: 'PASSWORD_RESET_TOKEN_INVALID',
        detail: 'Token reset password tidak valid atau sudah kedaluwarsa.',
        messages,
      };
    }

    if ((status === HttpStatus.BAD_REQUEST || status === HttpStatus.SERVICE_UNAVAILABLE) && lowerMessage.includes('mail_delivery_failed')) {
      return {
        code: 'MAIL_DELIVERY_FAILED',
        detail: 'Email belum dapat dikirim saat ini. Silakan coba lagi beberapa saat lagi.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('auth_google_disabled')) {
      return {
        code: 'AUTH_GOOGLE_DISABLED',
        detail: 'Login Google belum tersedia pada versi ini. Gunakan email dan password Anda.',
        messages,
      };
    }

    if (status === HttpStatus.BAD_REQUEST && lowerMessage.includes('auth_password_reset_disabled')) {
      return {
        code: 'AUTH_PASSWORD_RESET_DISABLED',
        detail: 'Fitur reset password sedang dinonaktifkan sementara.',
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

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('auth_profile_incomplete')) {
      return {
        code: 'AUTH_PROFILE_INCOMPLETE',
        detail: 'Lengkapi profil Google Anda terlebih dahulu sebelum melanjutkan.',
        messages,
      };
    }

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('auth_csrf_invalid')) {
      return {
        code: 'AUTH_CSRF_INVALID',
        detail: 'Permintaan tidak lolos validasi keamanan. Muat ulang halaman lalu coba lagi.',
        messages,
      };
    }

    if (status === HttpStatus.FORBIDDEN && lowerMessage.includes('auth_origin_invalid')) {
      return {
        code: 'AUTH_ORIGIN_INVALID',
        detail: 'Permintaan berasal dari origin yang tidak diizinkan.',
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
