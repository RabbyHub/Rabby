jest.mock('background/webapi', () => ({
  tab: { on: jest.fn() },
}));

jest.mock('background/service', () => ({
  keyringService: { hasVault: jest.fn(() => true) },
  permissionService: {},
  preferenceService: {},
  sessionService: {},
}));

jest.mock('@/background/controller/provider/internalMethod', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/background/controller/provider/rpcFlow', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue('ok'),
}));

import provider from '@/background/controller/provider';
import rpcFlow from '@/background/controller/provider/rpcFlow';
import {
  INTERNAL_REQUEST_ORIGIN,
  INTERNAL_REQUEST_SESSION,
} from '@/constant';

describe('provider signing context', () => {
  it('keeps nested signing origin and account canonical', async () => {
    const signing = {
      flow: { flowId: 'flow' },
      attempt: { flowId: 'flow', attemptId: 'attempt' },
      account: { address: '0xowner', type: 'privateKey', brandName: 'Rabby' },
      origin: 'https://dapp.example',
      rpcRequestId: 'request',
    };
    const request = {
      data: { method: 'eth_sendTransaction', params: [{}] },
      session: INTERNAL_REQUEST_SESSION,
      origin: INTERNAL_REQUEST_ORIGIN,
      signing,
    } as any;

    await expect(provider(request)).resolves.toBe('ok');

    expect(request.session.origin).toBe(signing.origin);
    expect(request.account).toEqual(signing.account);
    expect(rpcFlow).toHaveBeenCalledWith(request);
  });
});
