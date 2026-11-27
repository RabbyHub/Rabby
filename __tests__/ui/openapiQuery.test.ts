import { createQueryClient } from '@/ui/query/queryClient';
import { openapiQueryKey, openapiQueryOptions } from '@/ui/query/openapiQuery';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    openapi: {
      getToken: jest.fn(),
      tokenPrice: jest.fn(),
    },
  },
}));

const getToken = wallet.openapi.getToken as jest.Mock;
const tokenPrice = wallet.openapi.tokenPrice as jest.Mock;

const CHECKSUMMED = '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
const LOWER = CHECKSUMMED.toLowerCase();

describe('openapiQueryOptions', () => {
  beforeEach(() => {
    getToken.mockReset();
    tokenPrice.mockReset();
  });

  test('keys by method, arguments and scope', () => {
    expect(
      openapiQueryKey('getToken', [CHECKSUMMED, 'eth', 'eth'], {
        address: CHECKSUMMED,
        chainId: 'eth',
      })
    ).toEqual([
      'rabby',
      'openapi',
      { address: LOWER, chainId: 'eth', isTestnet: null, currency: null },
      { method: 'getToken', args: [LOWER, 'eth', 'eth'] },
    ]);
  });

  test('shares one cache entry for checksummed and lower-case addresses', () => {
    expect(openapiQueryKey('getToken', [CHECKSUMMED, 'eth', 'eth'])).toEqual(
      openapiQueryKey('getToken', [LOWER, 'eth', 'eth'])
    );
  });

  test('leaves non-address strings as they are', () => {
    expect(openapiQueryKey('tokenPrice', ['USDC'])[3]).toEqual({
      method: 'tokenPrice',
      args: ['USDC'],
    });
  });

  test('accepts only data-reading methods (checked by tsc)', () => {
    // @ts-expect-error setHost configures the client
    openapiQueryKey('setHost', ['https://example.com']);
    // @ts-expect-error postSafeTransactions resolves to void
    openapiQueryKey('postSafeTransactions', [{} as any]);
    // @ts-expect-error arguments must match the method
    openapiQueryKey('tokenPrice', [1]);
  });

  test('sends the original arguments and returns the raw response', async () => {
    const token = { id: 'eth', symbol: 'ETH' };
    getToken.mockResolvedValue(token);
    const client = createQueryClient();

    await expect(
      client.fetchQuery(
        openapiQueryOptions('getToken', [CHECKSUMMED, 'eth', 'eth'])
      )
    ).resolves.toBe(token);
    expect(getToken).toHaveBeenCalledWith(CHECKSUMMED, 'eth', 'eth');

    // The key carries the response type, so cache reads are typed (tsc).
    const cached: { id: string } | undefined = client.getQueryData(
      openapiQueryOptions('getToken', [CHECKSUMMED, 'eth', 'eth']).queryKey
    );
    expect(cached).toBe(token);
  });

  test('invalidates one method, one account, or every OpenAPI entry', async () => {
    const client = createQueryClient();
    const tokenKey = openapiQueryKey('getToken', [CHECKSUMMED, 'eth', 'eth'], {
      address: CHECKSUMMED,
    });
    const priceKey = openapiQueryKey('tokenPrice', ['eth']);
    client.setQueryData(tokenKey, { id: 'eth' } as any);
    client.setQueryData(priceKey, { last_price: 1 } as any);
    const isInvalidated = (key: readonly unknown[]) =>
      client.getQueryState(key)?.isInvalidated;

    await client.invalidateQueries({
      queryKey: ['rabby', 'openapi', {}, { method: 'tokenPrice' }],
    });
    expect(isInvalidated(priceKey)).toBe(true);
    expect(isInvalidated(tokenKey)).toBe(false);

    await client.invalidateQueries({
      queryKey: ['rabby', 'openapi', { address: LOWER }],
    });
    expect(isInvalidated(tokenKey)).toBe(true);

    client.setQueryData(tokenKey, { id: 'eth' } as any);
    client.setQueryData(priceKey, { last_price: 1 } as any);
    await client.invalidateQueries({ queryKey: ['rabby', 'openapi'] });
    expect(isInvalidated(tokenKey)).toBe(true);
    expect(isInvalidated(priceKey)).toBe(true);
  });
});
