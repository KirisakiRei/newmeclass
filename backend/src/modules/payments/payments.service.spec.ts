import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prismaMock: any = {};
  const service = new PaymentsService(prismaMock as any);

  it('maps midtrans settlement to SETTLEMENT', () => {
    expect(service.mapMidtransStatus('settlement')).toBe('SETTLEMENT');
  });

  it('maps midtrans pending to PENDING', () => {
    expect(service.mapMidtransStatus('pending')).toBe('PENDING');
  });

  it('maps midtrans cancel to CANCEL', () => {
    expect(service.mapMidtransStatus('cancel')).toBe('CANCEL');
  });

  it('maps unknown status to FAILURE', () => {
    expect(service.mapMidtransStatus('random-status')).toBe('FAILURE');
  });
});
