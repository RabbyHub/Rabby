import type { Chain } from '@debank/common';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { ARC_ERC20_USDC, WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import BigNumber from 'bignumber.js';

export const CALLDATA_TEST_CASES = [
  'native-to-erc20',
  'erc20-to-native',
  'erc20-to-erc20',
] as const;

export type CalldataTestCase = typeof CALLDATA_TEST_CASES[number];
const TIP20_TEST_CASES = ['erc20-to-erc20'] as const;

// Tempo has TIP20 fee assets, not an 18-decimal native gas token. The API's
// `tempo` placeholder must not generate native-swap coverage or quote amounts.
export const getCalldataTestCases = (
  chain: string
): readonly CalldataTestCase[] =>
  chain === 'TEMPO' ? TIP20_TEST_CASES : CALLDATA_TEST_CASES;
export interface CalldataTestPair {
  id: string;
  type: CalldataTestCase;
  from: TokenItem;
  to: TokenItem;
}

export interface CalldataTestScenario {
  id: string;
  pair: CalldataTestPair;
  usd: number;
  payAmount: string;
  fromTokenAmount: string;
  slippage: string;
}

export const CALLDATA_TEST_USD_SIZES = [1, 5, 20, 100, 1000, 10000];
export const CALLDATA_TEST_SLIPPAGES = ['0.1', '1', '3'];
export const CALLDATA_TEST_PAIR_LIMIT = 10;
export const CALLDATA_TEST_TOKEN_SEARCHES = [
  'USDC',
  'USDT',
  'WBTC',
  'WETH',
  'LINK',
  'UNI',
  'AAVE',
  'DAI',
  'PENDLE',
  'ARB',
  'OP',
  'wstETH',
  'cbETH',
  'rETH',
  'USDe',
  'sUSDe',
  'FRAX',
  'LUSD',
  'CRV',
  'BAL',
  'SNX',
  'GHO',
  'weETH',
  'WBNB',
  'WAVAX',
  'WPOL',
  'USDT0',
  'USDC.e',
  'USDT.e',
  'USDS',
  'sUSDS',
  'crvUSD',
  'PYUSD',
  'FDUSD',
  'TUSD',
  'USD1',
  'cbBTC',
  'tBTC',
  'BTC.b',
  'BTCB',
  'LBTC',
  'ezETH',
  'rsETH',
  'osETH',
  'swETH',
  'ETHx',
  'AERO',
  'CAKE',
  'JOE',
  'QUICK',
  'GMX',
  'GRAIL',
  'MAGIC',
  'VELO',
  'WELL',
  'BIFI',
  'SUSHI',
  'CVX',
  'FXS',
  'YFI',
  'COMP',
  'MKR',
  'SKY',
  'MORPHO',
  'LDO',
  'RPL',
  'ENA',
  'ONDO',
  'ZRO',
  'PEPE',
  'SHIB',
  'FLOKI',
  'DEGEN',
  'BRETT',
  'MOG',
];

const sameToken = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const classifyCalldataTestCase = (request: {
  fromToken: string;
  toToken: string;
  nativeTokenAddress: string;
}): CalldataTestCase | undefined => {
  if (sameToken(request.fromToken, request.toToken)) return;
  const fromNative = sameToken(request.fromToken, request.nativeTokenAddress);
  const toNative = sameToken(request.toToken, request.nativeTokenAddress);
  return fromNative
    ? 'native-to-erc20'
    : toNative
    ? 'erc20-to-native'
    : 'erc20-to-erc20';
};

const stablePriority = ['USDC', 'USDT', 'USDT0', 'DAI', 'USDC.E'];
const tokenPriority = (token: TokenItem) => {
  const index = stablePriority.indexOf(token.symbol.toUpperCase());
  return index < 0 ? stablePriority.length : index;
};

export const getCalldataTestTokenPool = (
  chain: Pick<Chain, 'enum' | 'serverId' | 'nativeTokenAddress'>,
  native: TokenItem | undefined,
  tokens: TokenItem[]
): TokenItem[] => {
  const wrapped = WrapTokenAddressMap[chain.enum];
  return Array.from(
    new Map(
      tokens
        .filter(
          (token) =>
            token.chain === chain.serverId &&
            /^0x[0-9a-f]{40}$/i.test(token.id) &&
            !sameToken(token.id, chain.nativeTokenAddress) &&
            !(
              String(chain.enum) === 'ARC' &&
              native &&
              sameToken(token.id, ARC_ERC20_USDC)
            ) &&
            !token.is_scam &&
            !token.is_suspicious &&
            !token.low_credit_score
        )
        .map((token) => [token.id.toLowerCase(), token])
    ).values()
  ).sort((a, b) => {
    const priority = (token: TokenItem) =>
      tokenPriority(token) * 10 +
      (wrapped && sameToken(token.id, wrapped) ? -1 : 0);
    return (
      priority(a) - priority(b) ||
      Number(!!b.is_core) - Number(!!a.is_core) ||
      a.id.toLowerCase().localeCompare(b.id.toLowerCase())
    );
  });
};

export const buildCalldataTestPairs = (
  chain: Pick<Chain, 'enum' | 'serverId' | 'nativeTokenAddress'>,
  native: TokenItem | undefined,
  tokens: TokenItem[]
): CalldataTestPair[] => {
  // Search a broad pool, then keep ten diverse cases rather than a Cartesian run.
  // Prefer one representative per symbol before including bridged aliases.
  const symbolKey = (token: TokenItem) =>
    token.symbol
      .toUpperCase()
      .replace(/\.E$/, '')
      .replace(/^USDT0$/, 'USDT');
  const pool = getCalldataTestTokenPool(chain, native, tokens);
  const symbols = new Set<string>();
  const unique: TokenItem[] = [],
    aliases: TokenItem[] = [];
  pool.forEach((token) => {
    const key = symbolKey(token);
    (symbols.has(key) ? aliases : unique).push(token);
    symbols.add(key);
  });
  const erc20s = [...unique, ...aliases].slice(0, 50);
  const wrapped = WrapTokenAddressMap[chain.enum];
  const pairs: CalldataTestPair[] = [];
  const add = (type: CalldataTestCase, from: TokenItem, to: TokenItem) =>
    pairs.push({
      id: JSON.stringify([from.id.toLowerCase(), to.id.toLowerCase()]),
      type,
      from,
      to,
    });
  if (native && getCalldataTestCases(chain.enum).includes('native-to-erc20')) {
    const swapTokens = erc20s.filter(
      (token) => !wrapped || !sameToken(token.id, wrapped)
    );
    swapTokens.forEach((token) => add('native-to-erc20', native, token));
    swapTokens.forEach((token) => add('erc20-to-native', token, native));
  }
  erc20s.forEach((from) =>
    erc20s.forEach((to) => {
      if (!sameToken(from.id, to.id)) add('erc20-to-erc20', from, to);
    })
  );
  const selected: CalldataTestPair[] = [];
  const usedSymbols = new Set<string>();
  const usage = new Map<string, number>();
  const candidates = new Map(pairs.map((pair) => [pair.id, pair]));
  const score = (pair: CalldataTestPair) => {
    const assets = [pair.from, pair.to];
    const freshSymbols = Array.from(new Set(assets.map(symbolKey))).filter(
      (symbol) => !usedSymbols.has(symbol)
    ).length;
    const freshAddresses = assets.filter(
      (token) => !usage.has(token.id.toLowerCase())
    ).length;
    const repetitions = assets.reduce(
      (total, token) => total + (usage.get(token.id.toLowerCase()) || 0),
      0
    );
    return freshSymbols * 1000 + freshAddresses * 100 - repetitions;
  };
  const choose = (type?: CalldataTestCase) => {
    let best: CalldataTestPair | undefined;
    let bestScore = -Infinity;
    candidates.forEach((pair) => {
      if (type && pair.type !== type) return;
      const value = score(pair);
      if (value > bestScore) {
        best = pair;
        bestScore = value;
      }
    });
    if (!best) return false;
    selected.push(best);
    candidates.delete(best.id);
    [best.from, best.to].forEach((token) => {
      usedSymbols.add(symbolKey(token));
      const key = token.id.toLowerCase();
      usage.set(key, (usage.get(key) || 0) + 1);
    });
    return true;
  };
  // Round-robin selection shares the token diversity across all three types.
  for (let round = 0; round < 3; round++) {
    getCalldataTestCases(chain.enum).forEach((type) => choose(type));
  }
  if (selected.length < CALLDATA_TEST_PAIR_LIMIT) choose('erc20-to-erc20');
  // Small chains may lack a type or enough tokens. Use other valid pairs without
  // duplicates; do not invent assets just to reach ten.
  while (selected.length < CALLDATA_TEST_PAIR_LIMIT && choose()) {}
  return selected;
};

export const getCalldataTestScenarioId = (request: {
  fromToken: string;
  toToken: string;
  fromTokenAmount: string;
  slippage: string;
}) =>
  JSON.stringify([
    request.fromToken.toLowerCase(),
    request.toToken.toLowerCase(),
    new BigNumber(request.fromTokenAmount).toFixed(),
    new BigNumber(request.slippage).toFixed(),
  ]);

export const buildCalldataTestScenarios = (
  pairs: CalldataTestPair[],
  sizes: readonly number[],
  slippages: readonly string[]
): CalldataTestScenario[] => {
  const amounts = new Map<
    string,
    { payAmount: string; fromTokenAmount: string }
  >();
  const scenarios = pairs.flatMap((pair) =>
    sizes.flatMap((usd) => {
      const key = `${pair.from.id.toLowerCase()}:${usd}`;
      let amount = amounts.get(key);
      if (!amount) {
        const payAmount = getCalldataTestAmount(pair.from, usd);
        amount = {
          payAmount,
          fromTokenAmount: new BigNumber(payAmount)
            .shiftedBy(pair.from.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toFixed(),
        };
        amounts.set(key, amount);
      }
      return slippages.map((slippage) => ({
        id: getCalldataTestScenarioId({
          fromToken: pair.from.id,
          toToken: pair.to.id,
          fromTokenAmount: amount!.fromTokenAmount,
          slippage,
        }),
        pair,
        usd,
        ...amount!,
        slippage,
      }));
    })
  );
  // Unknown prices or rounding can produce the same raw amount for two sizes.
  // Request each concrete calldata scenario once rather than inflating coverage.
  return Array.from(
    new Map(scenarios.map((scenario) => [scenario.id, scenario])).values()
  );
};

export const getCalldataTestAmount = (token: TokenItem, usd: number) => {
  const price =
    token.price > 0
      ? token.price
      : tokenPriority(token) < stablePriority.length
      ? 1
      : 0;
  const amount = (price
    ? new BigNumber(usd).div(price)
    : new BigNumber('0.01')
  ).decimalPlaces(token.decimals, BigNumber.ROUND_DOWN);
  return BigNumber.maximum(
    amount,
    new BigNumber(10).pow(-token.decimals)
  ).toFixed();
};
