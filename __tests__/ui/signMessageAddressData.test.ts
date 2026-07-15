import {
  getSignMessageAddressTagKinds,
  isSignMessageAddressMalicious,
  resolveSignMessageAddressData,
} from '@/ui/views/Approval/components/signMessageAddressData';

const malicious = '0xde709f2102306220921060314715629080e2fb77';
const token = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const protocol = '0xe592427a0aece92de3edee1f18e0157c05861564';
const unknown = '0x27b1fdb04752bbc536007a920d24acb045561c26';

test('applies the address tag priority', () => {
  expect(
    getSignMessageAddressTagKinds({
      isMalicious: true,
      alias: 'Treasury',
      isToken: true,
      hasProtocol: true,
    })
  ).toEqual(['malicious', 'alias']);
  expect(
    getSignMessageAddressTagKinds({
      isMalicious: false,
      alias: 'Treasury',
      isToken: true,
      hasProtocol: true,
    })
  ).toEqual(['alias']);
  expect(
    getSignMessageAddressTagKinds({
      isMalicious: false,
      isToken: true,
      hasProtocol: true,
    })
  ).toEqual(['token']);
  expect(
    getSignMessageAddressTagKinds({
      isMalicious: false,
      isToken: false,
      hasProtocol: true,
    })
  ).toEqual(['protocol']);
  expect(
    getSignMessageAddressTagKinds({
      isMalicious: false,
      isToken: false,
      hasProtocol: false,
    })
  ).toEqual([]);
});

test('uses address danger signals for EOAs and phishing for contracts', () => {
  expect(
    isSignMessageAddressMalicious({
      isContract: false,
      addressDesc: { is_scam: true } as any,
      contractInfo: null,
    })
  ).toBe(true);
  expect(
    isSignMessageAddressMalicious({
      isContract: false,
      addressDesc: { is_danger: true } as any,
      contractInfo: null,
    })
  ).toBe(true);
  expect(
    isSignMessageAddressMalicious({
      isContract: true,
      addressDesc: null,
      contractInfo: { is_phishing: true } as any,
    })
  ).toBe(true);
  expect(
    isSignMessageAddressMalicious({
      isContract: true,
      addressDesc: null,
      contractInfo: { is_danger: { auto: true } } as any,
    })
  ).toBe(false);
  expect(
    isSignMessageAddressMalicious({
      isContract: true,
      addressDesc: { is_danger: true, is_scam: true } as any,
      contractInfo: { is_phishing: false } as any,
    })
  ).toBe(false);
  expect(
    isSignMessageAddressMalicious({
      isContract: false,
      addressDesc: { name: 'My alias', is_spam: true } as any,
      contractInfo: { is_token: true, protocol: { name: 'Aave' } } as any,
    })
  ).toBe(false);
});

test('resolves signing address tags and detail data before rendering', async () => {
  const provider = {
    getAlias: jest.fn(async (address: string) =>
      address === malicious
        ? 'Treasury'
        : address === unknown
        ? 'Observer'
        : undefined
    ),
    getWhitelist: jest.fn(async () => [malicious]),
    getAccountsByPriority: jest.fn(async () => [
      {
        address: malicious,
        type: 'Simple Key Pair',
        brandName: 'Simple Key Pair',
      },
      {
        address: malicious,
        type: 'Watch Address',
        brandName: 'Watch Address',
      },
    ]),
    getAddressSource: jest.fn(async (address: string) =>
      address === malicious ? 'private-key' : null
    ),
    getAddressDesc: jest.fn(async (address: string) => ({
      id: address,
      born_at: 1,
      usd_value: 0,
      is_danger: null,
      is_spam: null,
      is_scam: address === malicious,
      name: '',
    })),
    getContractInfo: jest.fn(async (address: string) => {
      if (address === token) {
        return {
          is_token: true,
          protocol: null,
          credit: { value: 2_000_000_000, rank_at: 1 },
          is_danger: { auto: null, edit: null },
          is_phishing: null,
        };
      }
      if (address === protocol) {
        return {
          is_token: false,
          protocol: {
            id: 'uniswap',
            name: 'Uniswap',
            logo_url: 'uniswap.svg',
          },
          credit: { value: 1_000_000, rank_at: 2 },
          is_danger: { auto: null, edit: null },
          is_phishing: null,
        };
      }
      return null;
    }),
    hasInteraction: jest.fn(async () => true),
    hasTransfer: jest.fn(async () => true),
    getToken: jest.fn(async () => ({
      id: token,
      symbol: 'USDC',
      logo_url: 'usdc.svg',
    })),
  };

  const result = await resolveSignMessageAddressData({
    tokens: [malicious, token, protocol, unknown, token].map((value) => ({
      type: 'address' as const,
      value,
    })),
    chain: { serverId: 'eth' } as any,
    accountAddress: '0x341a1fbd51825e5a107db54ccb3166deba145479',
    provider: provider as any,
  });

  expect(result[malicious]).toMatchObject({
    alias: 'Treasury',
    isContract: false,
    isMalicious: true,
    kinds: ['malicious', 'alias'],
    hasTransfer: true,
    onTransferWhitelist: true,
    hasReceiverPrivateKeyInWallet: true,
    localAccount: {
      address: malicious,
      type: 'Simple Key Pair',
      brandName: 'Simple Key Pair',
    },
  });
  expect(result[token]).toMatchObject({
    isContract: true,
    kinds: ['token'],
    token: { symbol: 'USDC', logo_url: 'usdc.svg' },
  });
  expect(result[protocol]).toMatchObject({
    isContract: true,
    kinds: ['protocol'],
    protocol: { name: 'Uniswap', logo_url: 'uniswap.svg' },
    hasInteraction: true,
  });
  expect(result[unknown]).toMatchObject({
    alias: 'Observer',
    kinds: ['alias'],
    localAccount: null,
  });
  expect(provider.getWhitelist).toHaveBeenCalledTimes(1);
  expect(provider.getAccountsByPriority).toHaveBeenCalledTimes(1);
  expect(provider.getContractInfo).toHaveBeenCalledTimes(4);
});

test('leaves failed address lookups untagged and unblocked', async () => {
  const reject = async () => Promise.reject(new Error('offline'));
  const result = await resolveSignMessageAddressData({
    tokens: [{ type: 'address', value: malicious }],
    chain: { serverId: 'eth' } as any,
    accountAddress: '0x341a1fbd51825e5a107db54ccb3166deba145479',
    provider: {
      getAlias: reject,
      getWhitelist: reject,
      getAccountsByPriority: reject,
      getAddressSource: reject,
      getAddressDesc: reject,
      getContractInfo: reject,
      hasInteraction: reject,
      hasTransfer: reject,
      getToken: reject,
    } as any,
  });

  expect(result[malicious]).toMatchObject({
    kinds: [],
    isMalicious: false,
  });
});
