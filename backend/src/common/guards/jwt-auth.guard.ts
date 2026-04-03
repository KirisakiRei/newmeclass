import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthAudience, Role } from '@prisma/client';
import { Request } from 'express';
import { AUTH_AUDIENCE_KEY } from 'src/common/auth/auth-audience.decorator';
import { getSessionIdleTimeoutMs } from 'src/common/auth/auth-session.config';
import {
  readAccessTokenFromCookies,
  resolveAudienceFromPath,
  validateTrustedOriginRequest,
  validateCsrfRequest,
} from 'src/common/auth/auth-cookie.utils';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  private getIdleTimeoutMs(role?: Role) {
    return getSessionIdleTimeoutMs(role);
  }

  private resolveAudiences(context: ExecutionContext) {
    const explicit = this.reflector.getAllAndOverride<AuthAudience | AuthAudience[] | undefined>(AUTH_AUDIENCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (Array.isArray(explicit)) {
      return explicit;
    }
    if (explicit) return [explicit];
    const req = context.switchToHttp().getRequest<Request>();
    return [resolveAudienceFromPath(req.path || req.originalUrl || '')];
  }

  private readBearerToken(req: Request) {
    const auth = req.headers.authorization as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) return '';
    return auth.slice(7).trim();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const audiences = this.resolveAudiences(context);
    const bearerToken = this.readBearerToken(req);
    const tokensByAudience = new Map(
      audiences.map((audience) => [audience, readAccessTokenFromCookies(req, audience) || bearerToken]),
    );
    const hasAnyToken = Array.from(tokensByAudience.values()).some((token) => Boolean(token));

    if (!hasAnyToken) {
      throw new UnauthorizedException('Missing bearer token');
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) {
      if (!validateTrustedOriginRequest(req)) {
        throw new ForbiddenException('AUTH_ORIGIN_INVALID');
      }
      if (!validateCsrfRequest(req)) {
        throw new ForbiddenException('AUTH_CSRF_INVALID');
      }
    }

    let lastError: Error | null = null;

    for (const audience of audiences) {
      const token = tokensByAudience.get(audience);
      if (!token) continue;

      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });
        const sessionId = String(payload?.sid || '').trim();
        const tokenAudience = String(payload?.aud || '').trim();
        if (!sessionId || (tokenAudience && tokenAudience !== audience)) {
          throw new UnauthorizedException('Invalid session');
        }

        const session = await this.prisma.authSession.findFirst({
          where: {
            id: sessionId,
            userId: payload.sub,
            audience,
            revokedAt: null,
          },
        });

        if (
          !session
          || session.expiresAt.getTime() <= Date.now()
          || session.absoluteExpiresAt.getTime() <= Date.now()
        ) {
          throw new UnauthorizedException('Session expired');
        }

        const idleTimeoutMs = this.getIdleTimeoutMs(payload.role);
        const touchThresholdMs = Math.min(Math.floor(idleTimeoutMs / 2), 5 * 60 * 1000);
        let sessionExpiresAt = session.expiresAt;

        if ((session.expiresAt.getTime() - Date.now()) <= touchThresholdMs) {
          const updated = await this.prisma.authSession.update({
            where: { id: session.id },
            data: {
              expiresAt: new Date(Date.now() + idleTimeoutMs),
              lastActivityAt: new Date(),
            },
          });
          sessionExpiresAt = updated.expiresAt;
        }

        if (
          payload.role === Role.USER
          && !String(req.path || req.originalUrl || '').includes('/auth/me')
          && !String(req.path || req.originalUrl || '').includes('/auth/session')
          && !String(req.path || req.originalUrl || '').includes('/auth/logout')
          && !String(req.path || req.originalUrl || '').includes('/auth/refresh')
          && !String(req.path || req.originalUrl || '').includes('/auth/google/complete-profile')
        ) {
          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { onboardingCompletedAt: true, primaryAuthProvider: true },
          });
          if (user?.primaryAuthProvider === 'GOOGLE' && !user.onboardingCompletedAt) {
            throw new ForbiddenException('AUTH_PROFILE_INCOMPLETE');
          }
        }

        (req as any).user = {
          ...payload,
          sid: session.id,
          aud: audience,
          sessionExpiresAt,
        };
        return true;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        lastError = error as Error;
      }
    }

    if (lastError instanceof UnauthorizedException) {
      throw lastError;
    }
    throw new UnauthorizedException('Invalid token');
  }
}
