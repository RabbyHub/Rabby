import {
  createQueryClient,
  QUERY_GC_TIME,
  QUERY_STALE_TIME,
} from '@/ui/query/queryClient';
import { createQueryKey } from '@/ui/query/queryKey';
import { gasMarketQueryOptions } from '@/ui/query/resources/gasMarket';
import { tokenPriceQueryOptions } from '@/ui/query/resources/tokenPrice';
import type { WalletControllerType } from '@/ui/utils/WalletContext';

jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(() => ({ isTestnet: false })),
}));

describe('TanStack Query infrastructure', () => {
  test('uses extension-safe defaults', () => {
    const client = createQueryClient();
    const options = client.defaultQueryOptions({ queryKey: ['test'] });

    expect(QUERY_STALE_TIME).toBe(0);
    expect(options).toMatchObject({
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_GC_TIME,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
    expect(client.getDefaultOptions().mutations).toMatchObject({
      retry: false,
    });
  });

  test('normalizes account and currency identity in query keys', () => {
    expect(
      createQueryKey(
        'token',
        {
          address: '0xAbC',
          chainId: 'eth',
          isTestnet: false,
          currency: 'usd',
        },
        { tokenId: '0xToken' }
      )
    ).toEqual([
      'rabby',
      'token',
      {
        address: '0xabc',
        chainId: 'eth',
        isTestnet: false,
        currency: 'USD',
      },
      { tokenId: '0xToken' },
    ]);
  });

  test('uses the chain server id for gas-market requests', async () => {
    const gasMarketV2 = jest.fn().mockResolvedValue([
      {
        level: 'slow',
        price: 1e9,
      },
    ]);
    const wallet = ({ gasMarketV2 } as unknown) as WalletControllerType;
    const client = createQueryClient();

    await expect(
      client.fetchQuery(gasMarketQueryOptions(wallet, 'eth'))
    ).resolves.toBe(1);
    expect(gasMarketV2).toHaveBeenCalledWith({ chainId: 'eth' });
  });

  test('keeps resource failures in the query error state', async () => {
    const error = new Error('request failed');
    const wallet = ({
      gasMarketV2: jest.fn().mockRejectedValue(error),
      openapi: {
        tokenPrice: jest.fn().mockRejectedValue(error),
      },
    } as unknown) as WalletControllerType;
    const client = createQueryClient();

    await expect(
      client.fetchQuery(gasMarketQueryOptions(wallet, 'eth'))
    ).rejects.toBe(error);
    await expect(
      client.fetchQuery(tokenPriceQueryOptions(wallet, 'eth'))
    ).rejects.toBe(error);
  });
});
