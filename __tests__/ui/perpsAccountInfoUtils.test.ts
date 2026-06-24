import type { SpotMeta } from '@rabby-wallet/hyperliquid-sdk';
import type { SpotBalance } from '@/ui/views/DesktopPerps/utils';
import {
  usdcMarkPx,
  computeSpotPortfolioValue,
  computeTotalCollateralBalance,
  computeLtvAdjustedPortfolioValue,
  computePortfolioMarginRatio,
  computeBorrowCapUsed,
  computeCrossMarginRatio,
  computeUnifiedAccountRatio,
  SpotAssetCtxs,
} from '@/ui/views/DesktopPerps/components/AccountInfo/utils';

// HYPE/USDC spot pair '@107'; outcome token '#5741'.
const spotMeta: SpotMeta = {
  tokens: [
    { name: 'USDC', index: 0 },
    { name: 'HYPE', index: 150 },
    { name: 'USDT0', index: 268 },
  ],
  universe: [{ tokens: [150, 0], name: '@107', index: 107 }],
};
const spotAssetCtxs: SpotAssetCtxs = {
  '@107': { markPx: '40' },
  '#5741': { markPx: '2' },
};

const bal = (
  coin: string,
  token: number,
  total: string,
  ltv?: string
): SpotBalance => ({ coin, token, total, hold: '0', available: total, ltv });

// USDC (settlement) 100 + HYPE (ltv 0.5) 2 @ $40.
const balances: SpotBalance[] = [
  bal('USDC', 0, '100'),
  bal('HYPE', 150, '2', '0.5'),
];

describe('usdcMarkPx', () => {
  it('USDC resolves to 1', () => {
    expect(usdcMarkPx('USDC', spotAssetCtxs, spotMeta)).toBe(1);
  });
  it('resolves a spot token via its @index USDC pair markPx', () => {
    expect(usdcMarkPx('HYPE', spotAssetCtxs, spotMeta)).toBe(40);
  });
  it('resolves a + outcome token via the # key', () => {
    expect(usdcMarkPx('+5741', spotAssetCtxs, spotMeta)).toBe(2);
  });
  it('returns 0 for an unresolved token', () => {
    expect(usdcMarkPx('NOPE', spotAssetCtxs, spotMeta)).toBe(0);
  });
  it('returns 0 when spotMeta is missing', () => {
    expect(usdcMarkPx('HYPE', spotAssetCtxs, null)).toBe(0);
  });
});

describe('computeSpotPortfolioValue (Z3)', () => {
  it('sums all balances * price', () => {
    // 100*1 + 2*40 = 180
    expect(computeSpotPortfolioValue(balances, spotAssetCtxs, spotMeta)).toBe(
      180
    );
  });
});

describe('computeTotalCollateralBalance', () => {
  it('sums only settlement-token balances * price', () => {
    // USDC 100 only; HYPE excluded (not a settlement token)
    expect(
      computeTotalCollateralBalance(balances, spotAssetCtxs, spotMeta)
    ).toBe(100);
  });
});

describe('computeLtvAdjustedPortfolioValue', () => {
  it('weights settlement at 1 and ltv tokens by their ltv', () => {
    // USDC 100*1 + HYPE 2*40*0.5 = 100 + 40 = 140
    expect(
      computeLtvAdjustedPortfolioValue(balances, spotAssetCtxs, spotMeta)
    ).toBe(140);
  });
});

describe('computePortfolioMarginRatio', () => {
  it('reads the server field verbatim', () => {
    expect(
      computePortfolioMarginRatio({ portfolioMarginRatio: '0.1234' })
    ).toBe(0.1234);
  });
  it('defaults to 0 when absent', () => {
    expect(computePortfolioMarginRatio({})).toBe(0);
  });
});

describe('computeBorrowCapUsed', () => {
  it('reads only the USDC (token 0) entry', () => {
    expect(
      computeBorrowCapUsed({
        tokenToPortfolioBorrowRatio: [
          [0, '0.42'],
          [268, '0.99'],
        ],
      })
    ).toBe(0.42);
  });
  it('clamps to 1', () => {
    expect(
      computeBorrowCapUsed({ tokenToPortfolioBorrowRatio: [[0, '1.5']] })
    ).toBe(1);
  });
  it('returns 0 when there is no USDC entry', () => {
    expect(
      computeBorrowCapUsed({ tokenToPortfolioBorrowRatio: [[268, '0.5']] })
    ).toBe(0);
  });
});

describe('computeCrossMarginRatio', () => {
  it('= crossMaintenanceMarginUsed / (accountValue + 1e-8)', () => {
    const ratio = computeCrossMarginRatio({
      crossMaintenanceMarginUsed: '50',
      crossMarginSummary: { accountValue: '100' },
    } as any);
    expect(ratio).toBeCloseTo(0.5, 6);
  });
  it('does not divide-by-zero on an empty account', () => {
    expect(
      computeCrossMarginRatio({
        crossMaintenanceMarginUsed: '0',
        crossMarginSummary: { accountValue: '0' },
      } as any)
    ).toBe(0);
  });
});

describe('computeUnifiedAccountRatio', () => {
  it('clamps the ratio to a max of 1', () => {
    const ratio = computeUnifiedAccountRatio({
      clearinghouseState: {
        crossMaintByDex: { '': '200' },
        assetPositions: [],
      } as any,
      marketDataMap: { BTC: { dexId: '', quoteAsset: 'USDC' } } as any,
      spotBalancesMap: { USDC: { total: '100', available: '100' } },
    });
    // crossMargin 200 / available 100 = 2 -> clamped to 1
    expect(ratio).toBe(1);
  });
});
