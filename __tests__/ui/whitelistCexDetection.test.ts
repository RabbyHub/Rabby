import type { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';

import {
  findSupportedExchange,
  normalizeAddressDescCex,
  resolveSupportedDepositExchange,
} from '@/ui/utils/cex';

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

describe('normalizeAddressDescCex', () => {
  it('uses canonical metadata for a supported deposit exchange', () => {
    const desc = ({
      id: '0x1111111111111111111111111111111111111111',
      cex: {
        id: 'BINANCE',
        name: 'Stale Binance Name',
        logo_url: 'https://example.com/stale.png',
        is_deposit: true,
      },
    } as unknown) as AddrDescResponse['desc'];

    expect(normalizeAddressDescCex(desc, exchanges)?.cex).toEqual({
      id: 'binance',
      name: 'Binance',
      logo_url: 'https://example.com/binance.png',
      is_deposit: true,
    });
  });

  it('removes an unsupported exchange without mutating the source desc', () => {
    const contract = {
      eth: {
        multisig: false,
      },
    };
    const desc = ({
      id: '0x2222222222222222222222222222222222222222',
      cex: {
        id: 'crypto',
        name: 'Crypto.com',
        logo_url: 'https://example.com/crypto.png',
        is_deposit: true,
      },
      contract,
    } as unknown) as AddrDescResponse['desc'];

    const normalized = normalizeAddressDescCex(desc, exchanges);

    expect(normalized?.cex).toBeUndefined();
    expect(normalized?.contract).toBe(contract);
    expect(desc.cex?.id).toBe('crypto');
  });

  it('returns undefined when the address description is absent', () => {
    expect(normalizeAddressDescCex(undefined, exchanges)).toBeUndefined();
  });
});
