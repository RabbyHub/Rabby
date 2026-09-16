import type { SpotMeta } from '@rabby-wallet/hyperliquid-sdk';
import { UserAbstractionResp } from '@rabby-wallet/hyperliquid-sdk';
import type { SpotBalance } from '@/ui/views/DesktopPerps/utils';
import {
  SpotAssetCtxs,
  usdcMarkPx,
} from '@/ui/views/DesktopPerps/components/AccountInfo/utils';
import {
  getStakedHypeAmount,
  computeStakingValue,
  computePerpsPortfolioValue,
  computeLivePortfolioValue,
  computeAvailableBalance,
} from '@/ui/views/Perps/utils/accountPricing';

const spotMeta: SpotMeta = {
  tokens: [
    { name: 'USDC', index: 0 },
    { name: 'HYPE', index: 150 },
  ],
  universe: [{ tokens: [150, 0], name: '@107', index: 107 }],
};
const spotAssetCtxs: SpotAssetCtxs = { '@107': { markPx: '40' } };

const bal = (coin: string, token: number, total: string): SpotBalance => ({
  coin,
  token,
  total,
  hold: '0',
  available: total,
});

describe('getStakedHypeAmount', () => {
  it('sums delegated + undelegated + totalPendingWithdrawal', () => {
    expect(
      getStakedHypeAmount({
        delegated: '1.5',
        undelegated: '0.25',
        totalPendingWithdrawal: '0.25',
      })
    ).toBe('2');
  });

  it('returns 0 for a missing summary', () => {
    expect(getStakedHypeAmount(null)).toBe('0');
  });
});

describe('computeStakingValue', () => {
  it('prices staked HYPE at the spot mark', () => {
    expect(computeStakingValue('2', spotAssetCtxs, spotMeta)).toBe(80);
  });

  it('is 0 when nothing is staked', () => {
    expect(computeStakingValue('0', spotAssetCtxs, spotMeta)).toBe(0);
  });

  it('is 0 when the HYPE price cannot be resolved', () => {
    expect(computeStakingValue('2', {}, spotMeta)).toBe(0);
  });

  it('is 0 for a non-finite staked amount', () => {
    expect(computeStakingValue('NaN', spotAssetCtxs, spotMeta)).toBe(0);
    expect(computeStakingValue('Infinity', spotAssetCtxs, spotMeta)).toBe(0);
    expect(computeStakingValue('abc', spotAssetCtxs, spotMeta)).toBe(0);
  });
});

describe('computePerpsPortfolioValue', () => {
  const balances = [bal('USDC', 0, '100'), bal('HYPE', 150, '1')];

  it('unified: spot assets + staking, without the mirrored perps accountValue', () => {
    // spot = 100 USDC + 1 HYPE @40 = 140; staking = 2 HYPE @40 = 80
    expect(
      computePerpsPortfolioValue({
        balances,
        includePerpsAccountValue: false,
        perpsAccountValue: '999',
        spotAssetCtxs,
        spotMeta,
        stakingHype: '2',
      })
    ).toBe(220);
  });

  it('manual: adds the aggregated perps accountValue on top', () => {
    expect(
      computePerpsPortfolioValue({
        balances,
        includePerpsAccountValue: true,
        perpsAccountValue: '10',
        spotAssetCtxs,
        spotMeta,
        stakingHype: '2',
      })
    ).toBe(230);
  });

  it('counts staking in every mode, and tolerates a missing stakingHype', () => {
    expect(
      computePerpsPortfolioValue({
        balances,
        includePerpsAccountValue: false,
        perpsAccountValue: '0',
        spotAssetCtxs,
        spotMeta,
      })
    ).toBe(140);
  });

  it('lets a negative perps accountValue reduce the total', () => {
    // A deeply underwater cross account can report negative equity; it must
    // flow through rather than be clamped to 0.
    expect(
      computePerpsPortfolioValue({
        balances: [bal('USDC', 0, '100')],
        includePerpsAccountValue: true,
        perpsAccountValue: '-30',
        spotAssetCtxs,
        spotMeta,
      })
    ).toBe(70);
  });

  it('chains getStakedHypeAmount into the portfolio total', () => {
    // 1.5 + 0.25 + 0.25 = 2 HYPE @ $40 = $80 staking, on top of
    // 100 USDC + 1 HYPE @ $40 = $140 spot.
    expect(
      computePerpsPortfolioValue({
        balances: [bal('USDC', 0, '100'), bal('HYPE', 150, '1')],
        includePerpsAccountValue: false,
        perpsAccountValue: '0',
        spotAssetCtxs,
        spotMeta,
        stakingHype: getStakedHypeAmount({
          delegated: '1.5',
          undelegated: '0.25',
          totalPendingWithdrawal: '0.25',
        }),
      })
    ).toBe(220);
  });
});

describe('usdcMarkPx cycle guard', () => {
  it('does not blow the stack on a 2-hop price cycle', () => {
    // A quoted in B, B quoted in A — neither reaches USDC.
    const cyclicMeta: SpotMeta = {
      tokens: [
        { name: 'USDC', index: 0 },
        { name: 'AAA', index: 1 },
        { name: 'BBB', index: 2 },
      ],
      universe: [
        { tokens: [1, 2], name: '@200', index: 200 },
        { tokens: [2, 1], name: '@201', index: 201 },
      ],
    };
    const ctxs: SpotAssetCtxs = {
      '@200': { markPx: '2' },
      '@201': { markPx: '0.5' },
    };
    expect(() => usdcMarkPx('AAA', ctxs, cyclicMeta)).not.toThrow();
    expect(usdcMarkPx('AAA', ctxs, cyclicMeta)).toBe(0);
  });
});

describe('usdcMarkPx multi-hop chain', () => {
  it('resolves a token quoted in another token, chained through to USDC', () => {
    // FOO has no USDC pair: it is quoted in HYPE, and HYPE is quoted in USDC.
    // The cycle guard must not cut this legitimate chain short.
    const chainMeta: SpotMeta = {
      tokens: [
        { name: 'USDC', index: 0 },
        { name: 'HYPE', index: 150 },
        { name: 'FOO', index: 300 },
      ],
      universe: [
        { tokens: [150, 0], name: '@107', index: 107 },
        { tokens: [300, 150], name: '@300', index: 300 },
      ],
    };
    const ctxs: SpotAssetCtxs = {
      '@107': { markPx: '40' },
      '@300': { markPx: '0.25' },
    };
    // 0.25 HYPE per FOO * $40 per HYPE = $10
    expect(usdcMarkPx('FOO', ctxs, chainMeta)).toBe(10);
  });
});

describe('computeLivePortfolioValue gating', () => {
  const ready = {
    userAbstraction: UserAbstractionResp.unifiedAccount,
    spotMeta,
    isSpotStateReady: true,
    isUserDataReady: true,
    stakingStatus: 'success',
    stakingSummary: null,
    spotState: { balances: [bal('USDC', 0, '100')] },
    spotAssetCtxs,
    clearinghouseState: { marginSummary: { accountValue: '50' } },
  };

  it('returns null without spotMeta', () => {
    expect(computeLivePortfolioValue({ ...ready, spotMeta: null })).toBeNull();
  });

  it('returns null before the spot state is ready', () => {
    expect(
      computeLivePortfolioValue({ ...ready, isSpotStateReady: false })
    ).toBeNull();
  });

  it('returns null before staking has landed', () => {
    expect(
      computeLivePortfolioValue({ ...ready, stakingStatus: 'loading' })
    ).toBeNull();
  });

  it('does not wait on perps user data in spot-collateral modes', () => {
    // unified holds collateral on the spot side, so the perps clearinghouse
    // is not a prerequisite.
    expect(
      computeLivePortfolioValue({ ...ready, isUserDataReady: false })
    ).toBe(100);
  });

  it('waits on perps user data in manual mode', () => {
    expect(
      computeLivePortfolioValue({
        ...ready,
        userAbstraction: undefined,
        isUserDataReady: false,
      })
    ).toBeNull();
  });

  it('excludes the mirrored perps accountValue in unified mode', () => {
    // 100 USDC spot only; the 50 on the perps side mirrors the same money.
    expect(computeLivePortfolioValue(ready)).toBe(100);
  });

  it('adds the perps accountValue in manual mode', () => {
    expect(
      computeLivePortfolioValue({ ...ready, userAbstraction: undefined })
    ).toBe(150);
  });
});

describe('computeAvailableBalance', () => {
  it('unified: spot USDC available plus the raw perps withdrawable', () => {
    expect(
      computeAvailableBalance({
        userAbstraction: UserAbstractionResp.unifiedAccount,
        spotState: { balancesMap: { USDC: bal('USDC', 0, '100') } },
        clearinghouseState: { withdrawable: '105', perpsWithdrawable: '5' },
      })
    ).toBe(105);
  });

  it('unified: a zero perps withdrawable is zero, not a fallback trigger', () => {
    // `||` would read '0' as falsy and fall back to the merged withdrawable,
    // doubling Available for a unified account that keeps everything on spot.
    expect(
      computeAvailableBalance({
        userAbstraction: UserAbstractionResp.unifiedAccount,
        spotState: { balancesMap: { USDC: bal('USDC', 0, '100') } },
        clearinghouseState: { withdrawable: '100', perpsWithdrawable: '0' },
      })
    ).toBe(100);
  });

  it('unified: falls back to withdrawable when perpsWithdrawable is absent', () => {
    // Frame arrived before userAbstraction was known, so withdrawable is
    // still the raw perps value — not yet folded with spot USDC.
    expect(
      computeAvailableBalance({
        userAbstraction: UserAbstractionResp.unifiedAccount,
        spotState: { balancesMap: { USDC: bal('USDC', 0, '100') } },
        clearinghouseState: { withdrawable: '5' },
      })
    ).toBe(105);
  });

  it('unified: folds in zero instead of NaN when there is no USDC spot entry', () => {
    const result = computeAvailableBalance({
      userAbstraction: UserAbstractionResp.unifiedAccount,
      spotState: { balancesMap: {} },
      clearinghouseState: { withdrawable: '5', perpsWithdrawable: '5' },
    });
    expect(result).toBe(5);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('manual: reads only the raw perps withdrawable, not the unified-folded value', () => {
    // Guards against reading the merged `withdrawable` (which would still
    // carry a stale unified-mode overwrite) after switching to manual mode.
    expect(
      computeAvailableBalance({
        userAbstraction: UserAbstractionResp.default,
        spotState: { balancesMap: { USDC: bal('USDC', 0, '100') } },
        clearinghouseState: { withdrawable: '105', perpsWithdrawable: '5' },
      })
    ).toBe(5);
  });

  it('manual: a non-numeric perps withdrawable reads as 0, not NaN', () => {
    expect(
      computeAvailableBalance({
        userAbstraction: undefined,
        spotState: { balancesMap: {} },
        clearinghouseState: { withdrawable: 'abc' },
      })
    ).toBe(0);
  });

  it('portfolioMargin: reads the server-computed USDC net free margin', () => {
    expect(
      computeAvailableBalance({
        userAbstraction: UserAbstractionResp.portfolioMargin,
        spotState: { tokenToAvailableAfterMaintenance: [[0, '42']] },
        clearinghouseState: { withdrawable: '999' },
      })
    ).toBe(42);
  });
});
