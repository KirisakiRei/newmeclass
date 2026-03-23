import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/modules/prisma/prisma.service';

const USER_IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const STAFF_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private getIdleTimeoutMs(role?: Role) {
    return role === Role.USER ? USER_IDLE_TIMEOUT_MS : STAFF_IDLE_TIMEOUT_MS;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = auth.slice(7);
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      const sessionId = String(payload?.sid || '').trim();
      if (!sessionId) {
        throw new UnauthorizedException('Invalid session');
      }

      const session = await this.prisma.authSession.findFirst({
        where: {
          id: sessionId,
          userId: payload.sub,
          revokedAt: null,
        },
      });

      if (!session || session.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Session expired');
      }

      const idleTimeoutMs = this.getIdleTimeoutMs(payload.role);
      const touchThresholdMs = Math.min(Math.floor(idleTimeoutMs / 2), 5 * 60 * 1000);
      let sessionExpiresAt = session.expiresAt;

      if ((session.expiresAt.getTime() - Date.now()) <= touchThresholdMs) {
        const updated = await this.prisma.authSession.update({
          where: { id: session.id },
          data: { expiresAt: new Date(Date.now() + idleTimeoutMs) },
        });
        sessionExpiresAt = updated.expiresAt;
      }

      req.user = {
        ...payload,
        sessionExpiresAt,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
