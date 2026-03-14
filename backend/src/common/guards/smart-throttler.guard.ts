import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';

@Injectable()
export class SmartThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const path = this.getPath(req);
    const ip = this.getClientIp(req);
    const authIdentifier = this.extractAuthIdentifier(path, req);

    if (authIdentifier) {
      return `${ip}|auth:${authIdentifier}`;
    }

    if (path.includes('/certificates/download/')) {
      return `${ip}|cert:${this.extractCertificateNumber(path)}`;
    }

    const userId = req.user?.sub || req.user?.id;
    if (typeof userId === 'string' && userId.trim().length > 0) {
      return `${ip}|user:${userId.trim()}`;
    }

    return ip;
  }

  private getPath(req: Record<string, any>) {
    return String(req.originalUrl || req.url || req.path || '')
      .split('?')[0]
      .toLowerCase();
  }

  private getClientIp(req: Record<string, any>) {
    const forwarded = req.headers?.['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
      return forwarded.split(',')[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return String(forwarded[0]).trim();
    }

    const directIp = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress;
    if (typeof directIp === 'string' && directIp.trim().length > 0) {
      return directIp.trim();
    }

    return 'unknown-ip';
  }

  private extractAuthIdentifier(path: string, req: Record<string, any>) {
    if (!this.isAuthSensitivePath(path)) {
      return null;
    }

    const body = req.body || {};
    const rawIdentifier = [body.email, body.phone, body.whatsapp, body.identifier].find((value) => {
      return typeof value === 'string' && value.trim().length > 0;
    });

    if (typeof rawIdentifier !== 'string') {
      return null;
    }

    return rawIdentifier.replace(/\s+/g, '').toLowerCase();
  }

  private isAuthSensitivePath(path: string) {
    if (
      path.includes('/auth/login')
      || path.includes('/auth/register')
      || path.includes('/auth/forgot-password')
      || path.includes('/auth/reset-password')
    ) {
      return true;
    }

    return (
      path.includes('/admin/login')
      || path.includes('/yayasan/login')
      || path.includes('/yayasan/register')
      || path.includes('/mitra/login')
      || path.includes('/mitra/register')
    );
  }

  private extractCertificateNumber(path: string) {
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'unknown-certificate';
  }
}

