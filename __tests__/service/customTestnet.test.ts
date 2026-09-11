jest.mock('@/constant', () => ({ CUSTOM_RPC_ENABLED: false }));

jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
}));

jest.mock('@/ui/utils/token', () => ({
  customTestnetTokenToTokenItem: jest.fn((token) => token),
}));

jest.mock('@/utils/ga4', () => ({ ga4: {} }));
jest.mock('@/utils/matomo-request', () => ({ matomoRequestEvent: jest.fn() }));
jest.mock('@/background/utils', () => ({ createPersistStore: jest.fn() }));
jest.mock('@/background/utils/http', () => ({ http: {} }));
jest.mock('@/background/utils/ipfs', () => ({
  getFormattedIpfsUrl: jest.fn(),
}));
jest.mock('@/background/webapi', () => ({ storage: {} }));
jest.mock('@/background/service/rpc', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('viem/actions', () => ({
  getTransactionReceipt: jest.fn(),
}));

import type { TransactionReceipt } from 'viem';
import { getTransactionReceipt } from 'viem/actions';
import { findChain } from '@/utils/chain';
import {
  createTestnetChain,
  customTestnetService,
} from '@/background/service/customTestnet';

const hash = `0x${'ab'.repeat(32)}` as const;
const chain = createTestnetChain({
  id: 123456,
  name: 'Custom network',
  nativeTokenSymbol: 'ETH',
  rpcUrl: 'https://rpc.example',
});

describe('customTestnetService.getTx receipt status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(findChain).mockReturnValue(chain);
    jest
      .spyOn(customTestnetService, 'getClient')
      .mockReturnValue({} as ReturnType<typeof customTestnetService.getClient>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['success', 1],
    ['reverted', 0],
  ] as const)(
    'preserves a mined %s receipt as status %i',
    async (status, expectedStatus) => {
      jest.mocked(getTransactionReceipt).mockResolvedValue({
        transactionHash: hash,
        status,
        gasUsed: 21000n,
      } as TransactionReceipt);

      await expect(
        customTestnetService.getTx({ chainId: chain.id, hash })
      ).resolves.toMatchObject({
        hash,
        code: 0,
        status: expectedStatus,
        gas_used: 21000,
      });
    }
  );

  it('keeps an unavailable receipt unresolved instead of completing the transaction', async () => {
    jest
      .mocked(getTransactionReceipt)
      .mockRejectedValue(new Error('Receipt unavailable'));

    await expect(
      customTestnetService.getTx({ chainId: chain.id, hash })
    ).resolves.toMatchObject({
      hash,
      code: -1,
      status: 0,
      gas_used: 0,
    });
  });
});
