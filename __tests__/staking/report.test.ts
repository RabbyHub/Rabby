import {
  getStakingDecimalAssetsUsdValue,
  getStakingPoolToken,
  getStakingRawAssetsUsdValue,
  reportStakingTx,
} from '@/ui/views/Staking/utils/report';
import type { Account } from '@/background/service/preference';
import type { StakingPool } from '@/ui/views/Staking/types';
import stats from '@/stats';

jest.mock('@/stats', () => ({
  __esModule: true,
  default: {
    report: jest.fn(),
  },
}));

const mockReport = stats.report as jest.Mock;

const createPool = (overrides: Partial<StakingPool> = {}): StakingPool =>
  ({
    id: 'eth:0xpool',
    pool_address: '0xpool',
    chain_id: 'eth',
    type: 'univ3',
    protocol: {
      id: 'uniswap3',
      name: 'Uniswap V3',
    },
    tokens: {
      supplies: [
        {
          id: '0xusdc',
          symbol: 'USDC',
          decimals: 6,
          price: 1,
        },
        {
          id: '0xweth',
          symbol: 'WETH',
          decimals: 18,
          price: 2500,
        },
      ],
      rewards: [],
    },
    metricLabel: 'APR',
    userPositionIndexes: [],
    ...overrides,
  } as StakingPool);

describe('staking tx report helpers', () => {
  beforeEach(() => {
    mockReport.mockClear();
    process.env.release = '9.9.9';
  });

  it('builds pool token names from supply tokens', () => {
    expect(getStakingPoolToken(createPool())).toBe('USDC-WETH');
  });

  it('sums raw token usd values', () => {
    expect(
      getStakingRawAssetsUsdValue([
        {
          token: {
            id: '0xusdc',
            symbol: 'USDC',
            decimals: 6,
            price: 1,
          },
          rawAmount: '1000000',
        },
        {
          token: {
            id: '0xweth',
            symbol: 'WETH',
            decimals: 18,
            price: 2500,
          },
          rawAmount: '2000000000000000000',
        },
      ])
    ).toBe('5001');
  });

  it('sums decimal token usd values', () => {
    expect(
      getStakingDecimalAssetsUsdValue([
        {
          amount: '1.5',
          price: 2000,
        },
        {
          amount: '2',
          price: 1,
        },
      ])
    ).toBe('3002');
  });

  it('reports stakingTx with the documented field order', () => {
    reportStakingTx({
      account: {
        address: '0xuser',
        type: 'HD Key Tree',
      } as Account,
      pool: createPool(),
      txId: '0xtx',
      txType: 'deposit',
      poolAddress: '0xresolvedpool',
      usdValue: '123.45',
      createdAt: 1717300000000,
    });

    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport.mock.calls[0][0]).toBe('stakingTx');
    expect(Object.keys(mockReport.mock.calls[0][1])).toEqual([
      'created_at',
      'chain',
      'tx_id',
      'user_addr',
      'protocol_name',
      'pool_address',
      'pool_token',
      'tx_type',
      'usd_value',
      'app_version',
      'address_type',
    ]);
    expect(mockReport.mock.calls[0][1]).toEqual({
      created_at: 1717300000000,
      chain: 'eth',
      tx_id: '0xtx',
      user_addr: '0xuser',
      protocol_name: 'Uniswap V3',
      pool_address: '0xresolvedpool',
      pool_token: 'USDC-WETH',
      tx_type: 'deposit',
      usd_value: '123.45',
      app_version: '9.9.9',
      address_type: 'HD Key Tree',
    });
  });
});
