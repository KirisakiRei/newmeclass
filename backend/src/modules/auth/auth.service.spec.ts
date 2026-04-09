import { AuthAudience, AuthProvider, Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { hashLegacyPassword, hashLocalPassword } from 'src/common/auth/password.utils';

describe('AuthService.loginAdmin', () => {
  const password = 'Password123!';
  let prisma: any;
  let adminRbacService: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    adminRbacService = {
      ensureAdminRbacReady: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthService(prisma, {} as any, adminRbacService, {} as any);
    jest.spyOn(service as any, 'assertAdminLoginNotLocked').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'createAuditLog').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'createAuthSession').mockResolvedValue({
      session: { id: 'session-1', expiresAt: new Date('2026-01-01T00:00:00.000Z'), audience: AuthAudience.ADMIN },
      refreshToken: 'refresh-token',
    });
    jest.spyOn(service as any, 'mapUserWithComputedStats').mockResolvedValue({ id: 'user-1', email: 'admin@example.com' });
    jest.spyOn(service as any, 'buildAuthSuccessResponse').mockReturnValue({ success: true });
  });

  it('accepts legacy admin hashes and upgrades them to bcrypt', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      role: Role.ADMIN,
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: hashLegacyPassword(password),
      primaryAuthProvider: AuthProvider.LOCAL,
    });

    const result = await service.loginAdmin({ username: 'admin', password });

    expect(result).toEqual({ success: true });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: {
        passwordHash: expect.stringMatching(/^\$2/),
      },
    }));
    expect((service as any).createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ADMIN_LOGIN_SUCCESS',
    }));
  });

  it('accepts bcrypt admin hashes without rewriting them', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      role: Role.ADMIN,
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: await hashLocalPassword(password),
      primaryAuthProvider: AuthProvider.LOCAL,
    });

    const result = await service.loginAdmin({ email: 'admin@example.com', password });

    expect(result).toEqual({ success: true });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect((service as any).createAuthSession).toHaveBeenCalled();
  });

  it('rejects invalid admin passwords and keeps the hash untouched', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      role: Role.ADMIN,
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: hashLegacyPassword(password),
      primaryAuthProvider: AuthProvider.LOCAL,
    });

    await expect(service.loginAdmin({ username: 'admin', password: 'WrongPassword123!' }))
      .rejects
      .toThrow('Invalid credentials');

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect((service as any).createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ADMIN_LOGIN_FAILED',
      payload: expect.objectContaining({
        reason: 'invalid_password',
      }),
    }));
  });
});
