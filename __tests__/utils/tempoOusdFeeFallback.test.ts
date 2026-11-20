import BigNumber from 'bignumber.js';
import { decodeFunctionData, encodeAbiParameters, parseAbi } from 'viem';

import {
  TEMPO_FEE_MANAGER_ADDRESS,
  TEMPO_OUSD_TOKEN,
  TEMPO_PATH_USD_TOKEN,
} from '@/constant/tempo';
import {
  listTempoFeeTokenOptionsFromCache,
  loadTempoFeeTokenOptionsState,
  pickTempoProtocolFallbackFeeTokenId,
  shouldUseTempoProtocolFeeTokenFallback,
} from '@/utils/tempo';
import { resolveTempoProtocolFallbackGasToken } from '@/utils/transaction';

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
  },
}));

jest.mock('consts', () => ({
  CAN_ESTIMATE_L1_FEE_CHAINS: [],
  DEFAULT_GAS_LIMIT_BUFFER: 0,
  DEFAULT_GAS_LIMIT_RATIO: 1,
  GASPRICE_RANGE: {},
  KEYRING_CATEGORY_MAP: {},
  KEYRING_TYPE: {},
  MINIMUM_GAS_LIMIT: 21000,
  SAFE_GAS_LIMIT_BUFFER: 0,
  SAFE_GAS_LIMIT_RATIO: 1,
}));

jest.mock('@/utils/chain', () => ({
  findChain: () => ({
    id: 4217,
    serverId: 'tempo',
    enum: 'TEMPO',
  }),
}));

const USER = '0x1111111111111111111111111111111111111111';
const USDCE = '0x20c000000000000000000000b9537d11c60e8b50';
const ZERO = '0x0000000000000000000000000000000000000000';
const erc20Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

/**
 * Wallet stub: FeeManager returns `preference` (zero address = none), TIP-20
 * `balanceOf` returns `balances[token]`, and the DeBank API knows nothing, so
 * every balance is read on chain.
 */
const createWallet = ({
  preference = ZERO,
  balances = {},
}: {
  preference?: string;
  balances?: Record<string, bigint>;
}) => {
  const requestETHRpc = jest.fn(async ({ params }: any) => {
    const [{ to, data }] = params;
    if (to.toLowerCase() === TEMPO_FEE_MANAGER_ADDRESS) {
      return encodeAbiParameters([{ type: 'address' }], [preference as any]);
    }
    const { functionName } = decodeFunctionData({ abi: erc20Abi, data });
    if (functionName === 'decimals') {
      return encodeAbiParameters([{ type: 'uint8' }], [6]);
    }
    return encodeAbiParameters(
      [{ type: 'uint256' }],
      [balances[to.toLowerCase()] ?? 0n]
    );
  });
  return {
    requestETHRpc,
    openapi: {
      getToken: jest.fn().mockRejectedValue(new Error('not indexed')),
      listToken: jest.fn().mockResolvedValue([]),
    },
  } as any;
};

const loadState = (
  wallet: any,
  overrides: Partial<Parameters<typeof loadTempoFeeTokenOptionsState>[0]> = {}
) =>
  loadTempoFeeTokenOptionsState({
    wallet,
    userAddress: USER,
    chainServerId: 'tempo',
    maxGasCostRawAmount: new BigNumber(1000),
    maxGasCostRawAmountDecimals: 6,
    ...overrides,
  });

const same = (a?: string | null, b?: string | null) =>
  (a || '').toLowerCase() === (b || '').toLowerCase();

describe('Tempo OUSD protocol fee token fallback', () => {
  test('whitelist offers OUSD in the gas token picker', () => {
    const options = listTempoFeeTokenOptionsFromCache({
      chainServerId: 'tempo',
    });
    expect(options.some((item) => same(item.id, TEMPO_OUSD_TOKEN))).toBe(true);
  });

  test('fallback applies only without feeToken and stored preference', () => {
    expect(
      shouldUseTempoProtocolFeeTokenFallback({ chainServerId: 'tempo' })
    ).toBe(true);
    expect(
      shouldUseTempoProtocolFeeTokenFallback({
        chainServerId: 'tempo',
        txFeeToken: TEMPO_PATH_USD_TOKEN,
      })
    ).toBe(false);
    expect(
      shouldUseTempoProtocolFeeTokenFallback({
        chainServerId: 'tempo',
        hasUserFeeTokenPreference: true,
      })
    ).toBe(false);
    expect(
      shouldUseTempoProtocolFeeTokenFallback({ chainServerId: 'eth' })
    ).toBe(false);
  });

  test('picks pathUSD before OUSD, and nothing when neither covers the fee', () => {
    const option = (id: string, disabled: boolean) =>
      ({ id, isDisabledByTempoGasBalance: disabled } as any);
    expect(
      pickTempoProtocolFallbackFeeTokenId([
        option(TEMPO_OUSD_TOKEN, false),
        option(TEMPO_PATH_USD_TOKEN, false),
      ])
    ).toBe(TEMPO_PATH_USD_TOKEN);
    expect(
      pickTempoProtocolFallbackFeeTokenId([
        option(TEMPO_PATH_USD_TOKEN, true),
        option(TEMPO_OUSD_TOKEN, false),
      ])
    ).toBe(TEMPO_OUSD_TOKEN);
    expect(
      pickTempoProtocolFallbackFeeTokenId([
        option(TEMPO_PATH_USD_TOKEN, true),
        option(TEMPO_OUSD_TOKEN, true),
        option(USDCE, false),
      ])
    ).toBeNull();
  });

  describe('loadTempoFeeTokenOptionsState', () => {
    test('keeps pathUSD when it covers the max fee', async () => {
      const state = await loadState(
        createWallet({
          balances: {
            [TEMPO_PATH_USD_TOKEN]: 5000n,
            [TEMPO_OUSD_TOKEN]: 5000n,
          },
        })
      );
      expect(state.hasUserFeeTokenPreference).toBe(false);
      expect(same(state.preferredTokenId, TEMPO_PATH_USD_TOKEN)).toBe(true);
      expect(same(state.selectedOption?.id, TEMPO_PATH_USD_TOKEN)).toBe(true);
    });

    test('predicts OUSD for an OUSD-only user', async () => {
      const state = await loadState(
        createWallet({ balances: { [TEMPO_OUSD_TOKEN]: 5000n } })
      );
      expect(same(state.preferredTokenId, TEMPO_OUSD_TOKEN)).toBe(true);
      expect(same(state.selectedOption?.id, TEMPO_OUSD_TOKEN)).toBe(true);
    });

    test('stays on pathUSD when neither token covers the max fee', async () => {
      const state = await loadState(
        createWallet({
          balances: { [TEMPO_PATH_USD_TOKEN]: 10n, [TEMPO_OUSD_TOKEN]: 10n },
        })
      );
      expect(same(state.preferredTokenId, TEMPO_PATH_USD_TOKEN)).toBe(true);
      expect(state.selectedOption).toBeUndefined();
    });

    test('a stored preference disables the fallback', async () => {
      const state = await loadState(
        createWallet({
          preference: USDCE,
          balances: { [TEMPO_OUSD_TOKEN]: 5000n },
        })
      );
      expect(state.hasUserFeeTokenPreference).toBe(true);
      expect(same(state.preferredTokenId, USDCE)).toBe(true);
    });

    test('an explicit tx feeToken disables the fallback', async () => {
      const state = await loadState(
        createWallet({ balances: { [TEMPO_OUSD_TOKEN]: 5000n } }),
        { txFeeToken: TEMPO_PATH_USD_TOKEN }
      );
      expect(same(state.preferredTokenId, TEMPO_PATH_USD_TOKEN)).toBe(true);
    });

    test('honours a passed-in preference flag for a pathUSD current token', async () => {
      const wallet = createWallet({ balances: { [TEMPO_OUSD_TOKEN]: 5000n } });
      const withPreference = await loadState(wallet, {
        currentFeeTokenId: TEMPO_PATH_USD_TOKEN,
        hasUserFeeTokenPreference: true,
      });
      expect(same(withPreference.preferredTokenId, TEMPO_PATH_USD_TOKEN)).toBe(
        true
      );

      const withoutPreference = await loadState(wallet, {
        currentFeeTokenId: TEMPO_PATH_USD_TOKEN,
        hasUserFeeTokenPreference: false,
      });
      expect(same(withoutPreference.preferredTokenId, TEMPO_OUSD_TOKEN)).toBe(
        true
      );
    });
  });

  describe('resolveTempoProtocolFallbackGasToken', () => {
    const pathUsdBalance = (rawBalance: string, isUserPreference = false) => ({
      rawBalance,
      token: {
        tokenId: TEMPO_PATH_USD_TOKEN,
        symbol: 'pathUSD',
        decimals: 6,
      },
      isTempoUserFeeTokenPreference: isUserPreference,
    });
    const resolve = (
      wallet: any,
      gasTokenBalance: ReturnType<typeof pathUsdBalance>,
      txFeeToken?: string
    ) =>
      resolveTempoProtocolFallbackGasToken({
        wallet,
        address: USER,
        chainId: 4217,
        gasTokenBalance,
        txFeeToken,
        maxGasCostRawAmount: new BigNumber(1000),
      });

    test('switches to OUSD when pathUSD cannot cover the max fee', async () => {
      const result = await resolve(
        createWallet({ balances: { [TEMPO_OUSD_TOKEN]: 5000n } }),
        pathUsdBalance('0')
      );
      expect(same(result.token.tokenId, TEMPO_OUSD_TOKEN)).toBe(true);
      expect(result.rawBalance).toBe('5000');
    });

    test('keeps pathUSD without extra reads when it covers the max fee', async () => {
      const wallet = createWallet({});
      const input = pathUsdBalance('5000');
      expect(await resolve(wallet, input)).toBe(input);
      expect(wallet.requestETHRpc).not.toHaveBeenCalled();
    });

    test('keeps pathUSD when OUSD cannot cover the max fee either', async () => {
      const input = pathUsdBalance('0');
      expect(
        await resolve(
          createWallet({ balances: { [TEMPO_OUSD_TOKEN]: 10n } }),
          input
        )
      ).toBe(input);
    });

    test('no fallback with a stored preference or an explicit feeToken', async () => {
      const wallet = createWallet({ balances: { [TEMPO_OUSD_TOKEN]: 5000n } });
      const preferred = pathUsdBalance('0', true);
      expect(await resolve(wallet, preferred)).toBe(preferred);

      const explicit = pathUsdBalance('0');
      expect(await resolve(wallet, explicit, TEMPO_PATH_USD_TOKEN)).toBe(
        explicit
      );
      expect(wallet.requestETHRpc).not.toHaveBeenCalled();
    });
  });
});
