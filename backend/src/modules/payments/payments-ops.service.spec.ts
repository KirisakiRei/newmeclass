import { PaymentsOpsService } from './payments-ops.service';

describe('PaymentsOpsService', () => {
  const prismaMock: any = {};
  const paymentQueueMock: any = {};
  const paymentsServiceMock: any = {
    mapMidtransStatus: jest.fn(() => 'PENDING'),
  };
  const service = new PaymentsOpsService(prismaMock as any, paymentsServiceMock as any, paymentQueueMock as any);

  it('detects missing required webhook fields', () => {
    expect(service.validateMidtransWebhookPayload({})).toEqual([
      'order_id',
      'transaction_status',
      'status_code',
      'gross_amount',
    ]);
  });

  it('accepts complete webhook payload', () => {
    expect(service.validateMidtransWebhookPayload({
      order_id: 'PAY-123',
      transaction_status: 'pending',
      status_code: '201',
      gross_amount: '100000.00',
    })).toEqual([]);
  });
});
