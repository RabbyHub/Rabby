import {
  findSupportedExchange,
  resolveSupportedDepositExchange,
} from '@/ui/views/WhitelistInput/cex';

const exchanges = [
  {
    id: 'binance',
    name: 'Binance',
    logo: 'https://example.com/binance.png',
  },
  {
    id: 'okex',
    name: 'OKX',
    logo: 'https://example.com/okx.png',
  },
];

describe('findSupportedExchange', () => {
  it('matches a supported exchange id case-insensitively', () => {
    expect(findSupportedExchange(exchanges, 'BINANCE')).toBe(exchanges[0]);
  });

  it('returns null for an unsupported exchange id', () => {
    expect(findSupportedExchange(exchanges, 'crypto')).toBeNull();
  });

  it('returns null when the exchange id is absent', () => {
    expect(findSupportedExchange(exchanges)).toBeNull();
  });
});

describe('resolveSupportedDepositExchange', () => {
  it('returns the canonical supported-list item for a deposit address', () => {
    expect(
      resolveSupportedDepositExchange(
        {
          id: 'BINANCE',
          is_deposit: true,
        },
        exchanges
      )
    ).toBe(exchanges[0]);
  });

  it('rejects a detected deposit exchange missing from the support list', () => {
    expect(
      resolveSupportedDepositExchange(
        {
          id: 'crypto',
          is_deposit: true,
        },
        exchanges
      )
    ).toBeNull();
  });

  it('rejects a supported exchange when the address is not for deposits', () => {
    expect(
      resolveSupportedDepositExchange(
        {
          id: 'binance',
          is_deposit: false,
        },
        exchanges
      )
    ).toBeNull();
  });

  it('rejects an absent detection result', () => {
    expect(resolveSupportedDepositExchange(undefined, exchanges)).toBeNull();
  });
});
