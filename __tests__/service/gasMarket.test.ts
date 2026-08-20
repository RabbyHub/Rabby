const mockGasMarketV2 = jest.fn();
const mockGetRecommendNonce = jest.fn();

jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: { gasMarketV2: mockGasMarketV2 },
}));

jest.mock('@/background/controller/walletUtils/sign', () => ({
  getRecommendNonce: mockGetRecommendNonce,
}));

jest.mock('consts', () => ({
  CHAINS_ENUM: { LINEA: 'LINEA' },
}));

import { gasMarketV2 } from '@/background/service/gasMarket';

describe('gasMarketV2', () => {
  beforeEach(() => {
    mockGasMarketV2.mockReset().mockResolvedValue([]);
    mockGetRecommendNonce.mockReset().mockResolvedValue('0x9');
  });

  test('passes non-Linea requests through unchanged', async () => {
    await gasMarketV2({ chainId: '1', customGas: 12 });

    expect(mockGasMarketV2).toHaveBeenCalledWith({
      chainId: '1',
      customGas: 12,
      tx: undefined,
    });
  });

  test('builds the same Linea request and reuses the provided nonce', async () => {
    const tx = {
      chainId: 59144,
      from: '0xfrom',
      to: '0xto',
    } as any;

    await gasMarketV2({
      chain: { id: 59144, serverId: 'linea', enum: 'LINEA' } as any,
      tx,
      customGas: 12,
      recommendNonce: Promise.resolve('0x7'),
    });

    expect(mockGetRecommendNonce).not.toHaveBeenCalled();
    expect(mockGasMarketV2).toHaveBeenCalledWith({
      chainId: 'linea',
      customGas: 12,
      tx: {
        chainId: 59144,
        data: '0x',
        from: '0xfrom',
        gas: '0x0',
        nonce: '0x7',
        to: '0xto',
        value: undefined,
        gasPrice: '0x0',
      },
    });
  });

  // The caller shares this tx with parse/pre-exec. Defaulting its fields in
  // place would silently change the transaction those requests describe.
  test('does not mutate the caller tx while defaulting Linea fields', async () => {
    const tx = {
      chainId: 59144,
      from: '0xfrom',
      to: '0xto',
    } as any;

    await gasMarketV2({
      chain: { id: 59144, serverId: 'linea', enum: 'LINEA' } as any,
      tx,
      recommendNonce: Promise.resolve('0x7'),
    });

    expect(tx).toEqual({ chainId: 59144, from: '0xfrom', to: '0xto' });
  });
});
