import { decodeCalldata } from '@/utils/swapCalldata';
import { utils } from 'ethers';
import uniArbitrumUsdt0ToUsdc from '../fixtures/swap-calldata/uni-arbitrum-usdt0-to-usdc-v4.json';
import uniCrossChainRegressions from '../fixtures/swap-calldata/uni-cross-chain-regressions.json';
import {
  buildCalldataTestPairs,
  buildCalldataTestScenarios,
  getCalldataTestScenarioId,
  getCalldataTestTokenPool,
  getCalldataTestAmount,
  getCalldataTestCases,
} from '@/utils/swapCalldata/testCases';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import type { CHAINS_ENUM } from '@debank/common';
import {
  ARC_ERC20_USDC,
  DEX_ENUM,
  WrapTokenAddressMap,
} from '@rabby-wallet/rabby-swap';
import {
  buildCalldataTestCoverage,
  getCalldataTestScenarioKey,
} from '@/utils/swapCalldata/testResults';
import type {
  CalldataTestPlan,
  CalldataTestScenarioSummary,
} from '@/utils/swapCalldata/testResults';

const cases = [
  {
    name: 'Uniswap / Arbitrum / USDT0 to USDC / SwapProxy / V4',
    dexId: uniArbitrumUsdt0ToUsdc.dex,
    sample: uniArbitrumUsdt0ToUsdc,
    expectedAmounts: {
      fromTokenAmount: '4759000',
      minReceiveToTokenAmount: '4739264',
    },
  },
];

describe('recorded swap calldata decoding', () => {
  it.each(cases)('$name', ({ dexId, sample, expectedAmounts }) => {
    // Exercise the local decoder, without verifySdk's skipped-check fallback
    // or a receiver comparison against the currently selected account.
    const decoded = decodeCalldata(dexId, {
      ...sample.quote.tx,
      chainId: sample.chainId,
    });

    console.log('[swap-calldata-test]', dexId, decoded);

    // Address casing is not part of the decoded swap semantics.
    expect(
      decoded && {
        ...decoded,
        fromToken: decoded.fromToken.toLowerCase(),
        toToken: decoded.toToken.toLowerCase(),
        toTokenReceiver: decoded.toTokenReceiver.toLowerCase(),
      }
    ).toEqual({
      fromToken: sample.quote.fromToken.toLowerCase(),
      toToken: sample.quote.toToken.toLowerCase(),
      toTokenReceiver: sample.quote.tx.from.toLowerCase(),
      ...expectedAmounts,
    });
  });
});

describe('recorded Uni cross-chain regressions', () => {
  it.each(uniCrossChainRegressions.cases)(
    '$record.chain / record #$recordId / $issue',
    ({ record, expected }) => {
      const decoded = decodeCalldata(
        record.dex,
        {
          ...record.quote.tx,
          chainId: record.chainId,
        },
        { nativeTokenAddress: record.request.nativeTokenAddress }
      );
      expect(
        decoded && {
          ...decoded,
          fromToken: decoded.fromToken.toLowerCase(),
          toToken: decoded.toToken.toLowerCase(),
          toTokenReceiver: decoded.toTokenReceiver.toLowerCase(),
        }
      ).toEqual(expected);
    }
  );
});

describe('local decoder supported formats', () => {
  const fromToken = '0x1111111111111111111111111111111111111111';
  const toToken = '0x2222222222222222222222222222222222222222';
  const sender = '0x3333333333333333333333333333333333333333';
  const transaction = (data: string) => ({
    from: sender,
    to: '0x4444444444444444444444444444444444444444',
    value: '0',
    chainId: 1,
    data,
  });
  const expected = {
    fromToken,
    fromTokenAmount: '100',
    toToken,
    minReceiveToTokenAmount: '90',
    toTokenReceiver: sender,
  };

  it('decodes a Uni V3 exact-input command', () => {
    const router = new utils.Interface([
      'function execute(bytes commands, bytes[] inputs, uint256 deadline)',
    ]);
    const input = utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'uint256', 'bytes', 'bool'],
      [
        '0x0000000000000000000000000000000000000001',
        100,
        90,
        utils.solidityPack(
          ['address', 'uint24', 'address'],
          [fromToken, 3000, toToken]
        ),
        true,
      ]
    );
    const data = router.encodeFunctionData('execute', ['0x00', [input], 1]);

    expect(
      decodeCalldata('Uniswap', {
        ...transaction(data),
        to: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af',
      })
    ).toEqual(expected);
  });

  it('sums direct parallel V3 exact-input swaps', () => {
    const router = new utils.Interface([
      'function execute(bytes commands,bytes[] inputs,uint256 deadline)',
    ]);
    const inputs = [
      [40, 36],
      [60, 54],
    ].map(([amountIn, amountOut]) =>
      utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'bytes', 'bool'],
        [
          sender,
          amountIn,
          amountOut,
          utils.solidityPack(
            ['address', 'uint24', 'address'],
            [fromToken, 3000, toToken]
          ),
          true,
        ]
      )
    );
    expect(
      decodeCalldata('Uniswap', {
        ...transaction(
          router.encodeFunctionData('execute', ['0x0000', inputs, 1])
        ),
        to: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af',
      })
    ).toEqual(expected);
  });

  it('rejects an unresolved dynamic input instead of returning a zero-amount success', () => {
    const router = new utils.Interface([
      'function execute(bytes commands,bytes[] inputs,uint256 deadline)',
    ]);
    const input = utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'uint256', 'bytes', 'bool'],
      [
        sender,
        0,
        90,
        utils.solidityPack(
          ['address', 'uint24', 'address'],
          [fromToken, 3000, toToken]
        ),
        false,
      ]
    );
    expect(() =>
      decodeCalldata('Uniswap', {
        ...transaction(
          router.encodeFunctionData('execute', ['0x00', [input], 1])
        ),
        to: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af',
      })
    ).toThrow('Cannot determine the original input amount');
  });
});

describe('Tempo test recommendations', () => {
  it('requests actual TIP20 assets and excludes native-placeholder cases', () => {
    const native = {
      id: 'tempo',
      chain: 'tempo',
      symbol: 'USD',
      decimals: 18,
      price: 1,
    } as TokenItem;
    const tokens = [
      {
        id: '0x20c0000000000000000000000000000000000000',
        chain: 'tempo',
        symbol: 'pathUSD',
        decimals: 6,
        price: 1,
      },
      {
        id: '0x20c00000000000000000000014f22ca97301eb73',
        chain: 'tempo',
        symbol: 'USDT0',
        decimals: 6,
        price: 1,
      },
    ] as TokenItem[];
    const pairs = buildCalldataTestPairs(
      {
        enum: 'TEMPO' as CHAINS_ENUM,
        serverId: 'tempo',
        nativeTokenAddress: 'tempo',
      },
      native,
      tokens
    );
    expect(getCalldataTestCases('TEMPO')).toEqual(['erc20-to-erc20']);
    expect(pairs).toMatchObject([
      { type: 'erc20-to-erc20', from: tokens[1], to: tokens[0] },
      { type: 'erc20-to-erc20', from: tokens[0], to: tokens[1] },
    ]);
    expect(getCalldataTestAmount(pairs[0].from, 20)).toBe('20');
    expect(
      utils
        .parseUnits(
          getCalldataTestAmount(pairs[0].from, 20),
          pairs[0].from.decimals
        )
        .toString()
    ).toBe('20000000');
  });
});

describe('bounded calldata test matrix', () => {
  const chain = {
    enum: 'ETH' as CHAINS_ENUM,
    serverId: 'eth',
    nativeTokenAddress: 'eth',
  };
  const native = {
    id: 'eth',
    chain: 'eth',
    symbol: 'ETH',
    decimals: 18,
    price: 2000,
  } as TokenItem;
  const token = (index: number, overrides: Partial<TokenItem> = {}) =>
    ({
      id: utils.hexZeroPad(utils.hexlify(index), 20),
      chain: 'eth',
      symbol: `TOKEN${index}`,
      decimals: 18,
      price: 1,
      is_core: true,
      ...overrides,
    } as TokenItem);
  const wrapped = token(100, {
    id: WrapTokenAddressMap.ETH,
    symbol: 'WETH',
    price: 2000,
  });

  it.each([10, 50])(
    'selects ten diverse pairs from %i ERC20s, excluding direct wraps',
    (count) => {
      const tokens = [
        wrapped,
        ...Array.from({ length: count - 1 }, (_, i) => token(i + 1)),
      ];
      const pairs = buildCalldataTestPairs(chain, native, tokens);
      expect(pairs).toHaveLength(10);
      expect(new Set(pairs.map((pair) => pair.id)).size).toBe(pairs.length);
      expect(
        pairs.filter((pair) => pair.type === 'native-to-erc20')
      ).toHaveLength(3);
      expect(
        pairs.filter((pair) => pair.type === 'erc20-to-native')
      ).toHaveLength(3);
      expect(
        pairs.filter((pair) => pair.type === 'erc20-to-erc20')
      ).toHaveLength(4);
      expect(
        pairs.some(
          (pair) =>
            [pair.from.id, pair.to.id].includes('eth') &&
            [pair.from.id, pair.to.id].includes(wrapped.id)
        )
      ).toBe(false);
      expect(
        new Set(pairs.flatMap((pair) => [pair.from.id, pair.to.id])).size
      ).toBe(Math.min(count + 1, 15));
    }
  );

  it('filters duplicate, foreign-chain and risky tokens without inventing missing pairs', () => {
    const a = token(10),
      b = token(11);
    const pool = getCalldataTestTokenPool(chain, native, [
      a,
      b,
      { ...a, id: a.id.toUpperCase().replace('0X', '0x') },
      token(12, { chain: 'bsc' }),
      token(13, { is_scam: true }),
      token(14, { is_suspicious: true }),
      token(15, { low_credit_score: true }),
      native,
    ]);
    expect(pool).toHaveLength(2);
    const pairs = buildCalldataTestPairs(chain, native, pool);
    expect(pairs).toHaveLength(6);
    expect(new Set(pairs.map((pair) => pair.id)).size).toBe(6);
    const allowed = [native.id, a.id, b.id].map((id) => id.toLowerCase());
    expect(
      pairs.every(
        (pair) =>
          allowed.includes(pair.from.id.toLowerCase()) &&
          allowed.includes(pair.to.id.toLowerCase())
      )
    ).toBe(true);
  });

  it('prefers different symbols over bridged aliases', () => {
    const tokens = [
      ...Array.from({ length: 20 }, (_, i) =>
        token(i + 1, { symbol: i % 2 ? 'USDC.e' : 'USDC' })
      ),
      ...Array.from({ length: 15 }, (_, i) => token(i + 100)),
    ];
    const pairs = buildCalldataTestPairs(chain, undefined, tokens);
    expect(pairs).toHaveLength(10);
    const symbols = new Set(
      pairs
        .flatMap((pair) => [pair.from.symbol, pair.to.symbol])
        .map((symbol) => symbol.toUpperCase().replace(/\.E$/, ''))
    );
    expect(symbols.size).toBe(16);
  });

  it('limits Tempo to ten TIP20 pairs without native-placeholder cases', () => {
    const tempo = {
      enum: 'TEMPO' as CHAINS_ENUM,
      serverId: 'tempo',
      nativeTokenAddress: 'tempo',
    };
    const pairs = buildCalldataTestPairs(
      tempo,
      { ...native, id: 'tempo', chain: 'tempo' },
      Array.from({ length: 20 }, (_, i) =>
        token(i + 1, { chain: 'tempo', decimals: 6 })
      )
    );
    expect(pairs).toHaveLength(10);
    expect(pairs.every((pair) => pair.type === 'erc20-to-erc20')).toBe(true);
    expect(
      new Set(pairs.flatMap((pair) => [pair.from.id, pair.to.id])).size
    ).toBe(20);
  });

  it('does not recommend swapping Arc native USDC into its ERC20 alias', () => {
    const arc = {
      enum: 'ARC' as CHAINS_ENUM,
      serverId: 'arc',
      nativeTokenAddress: 'arc',
    };
    const arcNative = { ...native, id: 'arc', chain: 'arc', symbol: 'USDC' };
    const pairs = buildCalldataTestPairs(arc, arcNative, [
      token(1, { chain: 'arc' }),
      token(2, { chain: 'arc', id: ARC_ERC20_USDC }),
    ]);
    expect(pairs).toHaveLength(2);
    expect(
      pairs.every(
        (pair) =>
          pair.from.id !== ARC_ERC20_USDC && pair.to.id !== ARC_ERC20_USDC
      )
    ).toBe(true);
  });

  it('expands amounts and slippages with exact 6, 8 and 18 decimal units', () => {
    const tokens = [
      token(1, { symbol: 'USDC', decimals: 6 }),
      token(2, { symbol: 'WBTC', decimals: 8, price: 100000 }),
      wrapped,
    ];
    const pairs = buildCalldataTestPairs(chain, undefined, tokens);
    const scenarios = buildCalldataTestScenarios(pairs, [5, 20], ['0.1', '1']);
    expect(scenarios).toHaveLength(24);
    expect(new Set(scenarios.map((item) => item.id)).size).toBe(24);
    for (const [symbol, rawAmount] of [
      ['USDC', '5000000'],
      ['WBTC', '5000'],
      ['WETH', '2500000000000000'],
    ]) {
      expect(
        scenarios.find(
          (item) => item.usd === 5 && item.pair.from.symbol === symbol
        )?.fromTokenAmount
      ).toBe(rawAmount);
    }
  });

  it('does not count equivalent fallback amounts or numeric formatting as new scenarios', () => {
    const pairs = buildCalldataTestPairs(chain, undefined, [
      token(1, { price: 0 }),
      token(2, { price: 0 }),
    ]);
    expect(
      buildCalldataTestScenarios(pairs, [1, 20, 100], ['0.1', '1', '3'])
    ).toHaveLength(6);
    expect(
      getCalldataTestScenarioId({
        fromToken: token(10).id.toUpperCase(),
        toToken: token(11).id,
        fromTokenAmount: '1e6',
        slippage: '1.0',
      })
    ).toBe(
      getCalldataTestScenarioId({
        fromToken: token(10).id,
        toToken: token(11).id,
        fromTokenAmount: '1000000',
        slippage: '1',
      })
    );
  });

  it('counts each exact scenario and DEX independently and retains unfinished plans', () => {
    const pairs = buildCalldataTestPairs(chain, undefined, [
      token(1),
      token(2),
    ]);
    const scenarios = buildCalldataTestScenarios(pairs, [5, 20], ['1']);
    const plan = {
      key: 'plan',
      chain: 'ETH',
      createdAt: 1,
      dexes: [DEX_ENUM.UNI],
      scenarioIds: scenarios.map((item) => item.id),
    } as CalldataTestPlan;
    const result = {
      key: getCalldataTestScenarioKey('ETH', DEX_ENUM.UNI, scenarios[0].id),
      scenarioId: scenarios[0].id,
      chain: 'ETH',
      dex: DEX_ENUM.UNI,
      passed: 1,
      failed: 0,
      mismatch: 0,
      lastStatus: 'passed',
    } as CalldataTestScenarioSummary;
    const coverage = buildCalldataTestCoverage(
      [result],
      [plan, { ...plan, key: 'same-cases' }]
    );
    expect(coverage.byChainDex.get(`ETH:${DEX_ENUM.UNI}`)).toEqual({
      total: 4,
      attempted: 1,
      passed: 1,
      failed: 0,
      mismatch: 0,
      quoted: 1,
    });
    const retried = buildCalldataTestCoverage(
      [{ ...result, passed: 0, attempted: true, lastStatus: 'ignored' }],
      [plan]
    );
    expect(retried.byChainDex.get(`ETH:${DEX_ENUM.UNI}`)).toEqual({
      total: 4,
      attempted: 1,
      passed: 0,
      failed: 0,
      mismatch: 0,
      quoted: 0,
    });
    const mismatched = buildCalldataTestCoverage(
      [{ ...result, passed: 0, mismatch: 1, lastStatus: 'mismatch' }],
      [plan]
    );
    expect(mismatched.byChainDex.get(`ETH:${DEX_ENUM.UNI}`)?.mismatch).toBe(1);
    expect(mismatched.byChainDex.get(`ETH:${DEX_ENUM.UNI}`)?.passed).toBe(0);
    const failed = buildCalldataTestCoverage(
      [{ ...result, failed: 1, lastStatus: 'failed' }],
      [plan]
    );
    expect(failed.byChainDex.get(`ETH:${DEX_ENUM.UNI}`)?.passed).toBe(0);
    expect(failed.byChainDex.get(`ETH:${DEX_ENUM.UNI}`)?.failed).toBe(1);
    const bounded = buildCalldataTestCoverage(
      [result],
      [
        plan,
        {
          ...plan,
          key: 'current',
          createdAt: 2,
          scenarioIds: scenarios.slice(0, 2).map((item) => item.id),
        },
        {
          ...plan,
          key: 'old-large-run',
          createdAt: 3,
          scenarioIds: Array.from({ length: 100 }, (_, i) => `old-${i}`),
        },
      ]
    );
    expect(bounded.byChainDex.get(`ETH:${DEX_ENUM.UNI}`)?.total).toBe(2);
  });
});
