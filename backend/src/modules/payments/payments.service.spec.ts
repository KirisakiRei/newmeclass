import { PaymentsService } from './payments.service';
import { createHash } from 'crypto';

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

  it('verifies valid midtrans signature', () => {
    const originalKey = process.env.MIDTRANS_SERVER_KEY;
    process.env.MIDTRANS_SERVER_KEY = 'server-key-test';

    const payload: any = {
      order_id: 'PAY-123',
      status_code: '200',
      gross_amount: '100000.00',
    };
    payload.signature_key = createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    expect(service.verifyMidtransSignature(payload)).toBe(true);
    process.env.MIDTRANS_SERVER_KEY = originalKey;
  });

  it('rejects invalid midtrans signature', () => {
    const originalKey = process.env.MIDTRANS_SERVER_KEY;
    process.env.MIDTRANS_SERVER_KEY = 'server-key-test';

    expect(service.verifyMidtransSignature({
      order_id: 'PAY-123',
      status_code: '200',
      gross_amount: '100000.00',
      signature_key: 'invalid',
    })).toBe(false);

    process.env.MIDTRANS_SERVER_KEY = originalKey;
  });
});
