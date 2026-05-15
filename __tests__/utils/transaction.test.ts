import BigNumber from 'bignumber.js';

import { checkGasAndNonce, explainGas } from '@/utils/transaction';

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
  MINIMUM_GAS_LIMIT: 21000,
  SAFE_GAS_LIMIT_BUFFER: 0,
  SAFE_GAS_LIMIT_RATIO: 1,
}));

jest.mock('@/utils/chain', () => ({
  findChain: () => ({
    serverId: 'tempo',
    enum: 'TEMPO',
  }),
}));

jest.mock('@/utils/tempo', () => ({
  getTempoFeeTokenInfo: jest.fn(),
  isTempoChain: (serverId?: string) => serverId === 'tempo',
}));

const createCheckParams = (overrides = {}) => ({
  recommendGasLimitRatio: 1,
  recommendGasLimit: 21000,
  recommendNonce: 0,
  tx: {
    chainId: 123,
    value: '0x0',
  },
  gasLimit: 21000,
  nonce: 0,
  isCancel: false,
  isSpeedUp: false,
  isGnosisAccount: false,
  nativeTokenBalance: '2000',
  gasTokenDecimals: 6,
  gasTokenId: '0xselected',
  tempoPreferredFeeTokenId: '0xpreferred',
  checkTxValueInBalance: false,
  gasExplainResponse: {
    gasCostUsd: new BigNumber(0),
    gasCostAmount: new BigNumber(0),
    maxGasCostAmount: new BigNumber(0),
    maxGasCostRawAmount: new BigNumber(1500),
  },
  ...overrides,
});

describe('checkGasAndNonce tempo fee token', () => {
  test('checks tempo fee token balance against gas cost in token decimals', async () => {
    const gasExplainResponse = await explainGas({
      gasUsed: 50000,
      gasPrice: 30000000000,
      chainId: 123,
      nativeTokenPrice: 1,
      tx: {
        chainId: 123,
        value: '0x0',
      } as any,
      wallet: {} as any,
      gasLimit: '50000',
      account: {} as any,
      gasTokenDecimals: 6,
    });

    expect(gasExplainResponse.maxGasCostRawAmount.toFixed()).toBe('1500');
    expect(
      checkGasAndNonce(
        createCheckParams({
          nativeTokenBalance: '1500',
          tempoPreferredFeeTokenId: '0xselected',
          gasExplainResponse,
        }) as Parameters<typeof checkGasAndNonce>[0]
      ).some((item) => item.code === 3001)
    ).toBe(false);
  });

  test('uses tx feeToken before stale preferred fee token', () => {
    const errors = checkGasAndNonce(
      createCheckParams({
        tx: {
          chainId: 123,
          value: '0x0',
          feeToken: '0xselected',
        },
      }) as Parameters<typeof checkGasAndNonce>[0]
    );

    expect(errors.some((item) => item.code === 3001)).toBe(false);
  });

  test('falls back to preferred fee token when tx feeToken is missing', () => {
    const errors = checkGasAndNonce(
      createCheckParams() as Parameters<typeof checkGasAndNonce>[0]
    );

    expect(errors.some((item) => item.code === 3001)).toBe(true);
  });
});
