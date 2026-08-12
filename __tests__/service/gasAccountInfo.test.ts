const mockGetGasAccountInfoV2 = jest.fn();

jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: {
    getGasAccountInfoV2: mockGetGasAccountInfoV2,
  },
}));

import { getGasAccountInfoV2InFlight } from '@/background/utils/gasAccountInfo';

describe('getGasAccountInfoV2InFlight', () => {
  it('deduplicates concurrent requests but fetches again after settlement', async () => {
    mockGetGasAccountInfoV2.mockResolvedValue({
      account: { balance: 1 },
    });

    const first = getGasAccountInfoV2InFlight({ id: '0xAbC' });
    const second = getGasAccountInfoV2InFlight({ id: '0xabc' });

    expect(second).toBe(first);
    expect(mockGetGasAccountInfoV2).toHaveBeenCalledTimes(1);

    await first;
    await getGasAccountInfoV2InFlight({ id: '0xabc' });

    expect(mockGetGasAccountInfoV2).toHaveBeenCalledTimes(2);
  });
});
