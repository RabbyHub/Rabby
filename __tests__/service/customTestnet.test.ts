jest.mock('@/constant', () => ({ CUSTOM_RPC_ENABLED: false }));

jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  updateChainStore: jest.fn(),
}));

jest.mock('@/ui/utils/token', () => ({
  customTestnetTokenToTokenItem: jest.fn((token) => token),
}));

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
  getBlock: jest.fn(),
  getGasPrice: jest.fn(),
  estimateMaxPriorityFeePerGas: jest.fn(),
}));

import type { TransactionReceipt } from 'viem';
import {
  estimateMaxPriorityFeePerGas,
  getBlock,
  getGasPrice,
  getTransactionReceipt,
} from 'viem/actions';
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

const GWEI = 1_000_000_000;

describe('customTestnetService EIP-1559 detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    customTestnetService.store.customTestnet = { [chain.id]: chain };
    customTestnetService.store.eip1559 = {};
    jest
      .spyOn(customTestnetService, 'getClient')
      .mockReturnValue({} as ReturnType<typeof customTestnetService.getClient>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const listedEip1559 = () =>
    customTestnetService.getList().find((item) => item.id === chain.id)?.eip[
      '1559'
    ];

  it('defaults to legacy before detection', () => {
    expect(listedEip1559()).toBe(false);
  });

  it.each([
    ['a block with baseFeePerGas', { baseFeePerGas: 0n }, true],
    ['a block without baseFeePerGas', { baseFeePerGas: null }, false],
  ])('marks %s', async (_name, block, expected) => {
    jest.mocked(getBlock).mockResolvedValue(block as any);

    await customTestnetService.detectEip1559(chain.id);

    expect(customTestnetService.store.eip1559[chain.id].supported).toBe(
      expected
    );
    expect(listedEip1559()).toBe(expected);
  });

  it('keeps the previous result when the RPC fails', async () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };
    jest.mocked(getBlock).mockRejectedValue(new Error('RPC down'));

    await customTestnetService.detectEip1559(chain.id);

    expect(customTestnetService.store.eip1559[chain.id]).toEqual({
      supported: true,
      checkedAt: 1,
    });
  });

  it('forgets the result when the network is removed', () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };

    customTestnetService.remove(chain.id);

    expect(customTestnetService.store.eip1559).toEqual({});
  });
});

describe('customTestnetService.getGasMarket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    customTestnetService.store.eip1559 = {};
    jest
      .spyOn(customTestnetService, 'getClient')
      .mockReturnValue({} as ReturnType<typeof customTestnetService.getClient>);
    jest.mocked(getGasPrice).mockResolvedValue(BigInt(10 * GWEI));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const pick = (
    levels: Awaited<ReturnType<typeof customTestnetService.getGasMarket>>
  ) =>
    levels.map(({ level, price, priority_price, base_fee }) => ({
      level,
      price,
      priority_price,
      base_fee,
    }));

  it('splits baseFee and tip on an EIP-1559 network', async () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };
    jest
      .mocked(getBlock)
      .mockResolvedValue({ baseFeePerGas: BigInt(10 * GWEI) } as any);
    jest.mocked(estimateMaxPriorityFeePerGas).mockResolvedValue(BigInt(GWEI));

    const levels = await customTestnetService.getGasMarket({
      chainId: chain.id,
      custom: 5 * GWEI,
    });

    expect(pick(levels)).toEqual([
      {
        level: 'slow',
        price: 13 * GWEI,
        priority_price: GWEI,
        base_fee: 10 * GWEI,
      },
      {
        level: 'normal',
        price: 16 * GWEI,
        priority_price: GWEI,
        base_fee: 10 * GWEI,
      },
      {
        level: 'fast',
        price: 21.5 * GWEI,
        priority_price: 1.5 * GWEI,
        base_fee: 10 * GWEI,
      },
      {
        level: 'custom',
        price: 5 * GWEI,
        priority_price: GWEI,
        base_fee: 10 * GWEI,
      },
    ]);
  });

  it('falls back to eth_gasPrice with maxFee == tip when estimation fails', async () => {
    customTestnetService.store.eip1559 = {
      [chain.id]: { supported: true, checkedAt: 1 },
    };
    jest.mocked(getBlock).mockRejectedValue(new Error('RPC down'));
    jest.mocked(estimateMaxPriorityFeePerGas).mockResolvedValue(BigInt(GWEI));

    const levels = await customTestnetService.getGasMarket({
      chainId: chain.id,
    });

    expect(levels.map((item) => item.price)).toEqual([
      11 * GWEI,
      12 * GWEI,
      12.5 * GWEI,
      0,
    ]);
    levels.forEach((item) => expect(item.priority_price).toBe(item.price));
  });

  it('keeps the legacy market on a network without EIP-1559', async () => {
    const levels = await customTestnetService.getGasMarket({
      chainId: chain.id,
    });

    expect(getBlock).not.toHaveBeenCalled();
    expect(levels.map((item) => item.priority_price)).toEqual([
      9.4 * GWEI,
      9.7 * GWEI,
      9.8 * GWEI,
      0,
    ]);
  });
});
