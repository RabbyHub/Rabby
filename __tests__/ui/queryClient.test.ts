import {
  createQueryClient,
  QUERY_GC_TIME,
  QUERY_STALE_TIME,
} from '@/ui/query/queryClient';
import { createQueryKey } from '@/ui/query/queryKey';

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
});
