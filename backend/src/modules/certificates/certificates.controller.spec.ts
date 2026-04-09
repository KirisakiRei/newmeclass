import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CertificatesController } from './certificates.controller';

describe('CertificatesController.check-eligibility', () => {
  let controller: CertificatesController;

  beforeEach(() => {
    controller = new CertificatesController({} as any, {} as any, {} as any);
  });

  it('returns eligible true when the logged-in user has a latest result', async () => {
    jest.spyOn(controller as any, 'resolveCertificateSourceData').mockResolvedValue({
      latestResult: { id: 'result-1' },
    });

    await expect(controller.eligibility({ sub: 'user-1', role: Role.USER })).resolves.toEqual({ eligible: true });
  });

  it('returns eligible false when the logged-in user has no latest result', async () => {
    jest.spyOn(controller as any, 'resolveCertificateSourceData').mockResolvedValue({
      latestResult: null,
    });

    await expect(controller.eligibility({ sub: 'user-1', role: Role.USER })).resolves.toEqual({ eligible: false });
  });

  it('returns eligible false for non-user roles without querying certificate data', async () => {
    const sourceSpy = jest.spyOn(controller as any, 'resolveCertificateSourceData');

    await expect(controller.eligibility({ sub: 'yayasan-1', role: Role.YAYASAN })).resolves.toEqual({ eligible: false });
    expect(sourceSpy).not.toHaveBeenCalled();
  });

  it('returns eligible false when the current user record is missing', async () => {
    jest.spyOn(controller as any, 'resolveCertificateSourceData').mockRejectedValue(new NotFoundException('User not found'));

    await expect(controller.eligibility({ sub: 'missing-user', role: Role.USER })).resolves.toEqual({ eligible: false });
  });

  it('builds a public verification URL from the certificate number', () => {
    const url = (controller as any).buildCertificateVerificationUrl('NMC-2026-U123456');

    expect(url).toContain('/certificate/verify');
    expect(url).toContain('certificateNumber=NMC-2026-U123456');
  });
});
