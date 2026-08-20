import BigNumber from 'bignumber.js';
import { intToHex, isHexString } from '@ethereumjs/util';
import { omit } from 'lodash';

import {
  buildParseTxRequest,
  buildPreExecTxRequest,
  buildSignTx,
  normalizeTxParams,
  checkGasAndNonce,
  explainGas,
  getPendingTxs,
  prepareInitialGasSelection,
  shouldUpdateNonce,
} from '@/utils/transaction';

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

describe('shouldUpdateNonce', () => {
  const tx = { from: '0xfrom', to: '0xto' } as any;

  test('updates an ordinary transaction without a nonce', () => {
    expect(shouldUpdateNonce(tx)).toBe(true);
  });

  test('keeps the existing SignTx behavior for an explicit nonce', () => {
    expect(shouldUpdateNonce({ ...tx, nonce: '0x1' })).toBe(true);
  });

  test('preserves nonce for speed up and cancel transactions', () => {
    expect(
      shouldUpdateNonce({ ...tx, nonce: '0x1', isSpeedUp: true } as any)
    ).toBe(false);
    expect(
      shouldUpdateNonce({ ...tx, nonce: '0x1', isCancel: true } as any)
    ).toBe(false);
  });

  test('preserves nonce for same-address transactions and user changes', () => {
    expect(
      shouldUpdateNonce({
        ...tx,
        nonce: '0x1',
        to: tx.from,
      })
    ).toBe(false);
    expect(shouldUpdateNonce({ ...tx, nonceChanged: true })).toBe(false);
  });
});

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

describe('getPendingTxs', () => {
  test('returns same-chain pending txs sorted by nonce for pre-exec', async () => {
    const pending = (chainId: number, nonce: number) => ({
      chainId,
      nonce,
      createdAt: nonce * 1000,
      txs: [
        {
          rawTx: {
            from: '0xfrom',
            to: `0xto${nonce}`,
            chainId,
            data: `0x${nonce}`,
            nonce: `0x${nonce}`,
            value: '0x0',
            gasPrice: `0x${nonce}`,
            gas: '0x5208',
          },
        },
      ],
    });
    const wallet = {
      getTransactionHistory: jest.fn().mockResolvedValue({
        pendings: [pending(1, 3), pending(1, 1), pending(2, 2), pending(1, 2)],
      }),
    };

    const txs = await getPendingTxs({
      recommendNonce: '0x4',
      wallet: wallet as any,
      address: '0xfrom',
      chainId: 1,
    });

    expect(txs.map((tx) => tx.nonce)).toEqual(['0x1', '0x2', '0x3']);
  });
});

test('buildParseTxRequest preserves object and tuple authorization lists', () => {
  const request = buildParseTxRequest({
    tx: { from: '0xfrom', chainId: 1 } as any,
    chainId: '1',
    nonce: '0x1',
    origin: '',
    addr: '0xfrom',
    support1559: true,
    enable7702: true,
    authorizationList: [
      { chainId: '0x1', address: '0xobject', nonce: '0x2' },
      ['0x2', '0xtuple', '0x3'],
    ],
  });

  expect((request.tx as any).authorizationList).toEqual([
    [1, '0xobject', 2],
    [2, '0xtuple', 3],
  ]);
});

test('buildPreExecTxRequest normalizes fallback transaction fields', () => {
  // buildPreExecTxRequest assumes tx has already been through
  // normalizeTxParams (gas/gasLimit precedence is resolved there, not here)
  // - it only fills in fields that are safe to default on their own.
  const request = buildPreExecTxRequest({
    tx: {
      from: '0xfrom',
      gas: '0x5208',
    } as any,
    nonce: '0x1',
    origin: '',
    address: '0xfrom',
    updateNonce: true,
    pendingTxList: [],
    delegateCall: false,
  });

  expect(request.tx).toMatchObject({
    nonce: '0x1',
    data: '0x',
    value: '0x0',
    gas: '0x5208',
  });
});

test('normalizeTxParams prefers gasLimit over gas when both are present', () => {
  const tx = normalizeTxParams({
    from: '0xfrom',
    gas: '0x1',
    gasLimit: 21000,
  } as any);

  expect(tx.gas).toBe('0x5208');
});

test('normalizeTxParams normalizes numeric transaction fields', () => {
  const tx = normalizeTxParams({
    from: '0xfrom',
    gasPrice: 1,
    maxFeePerGas: '2',
    maxPriorityFeePerGas: 3,
    value: 4,
    data: 'abcd',
  } as any);

  expect(tx).toMatchObject({
    gasPrice: '0x1',
    maxFeePerGas: '0x2',
    maxPriorityFeePerGas: '0x3',
    value: '0x4',
    data: '0xabcd',
  });
});

test('prepareInitialGasSelection keeps the initial SignTx gas behavior', async () => {
  const loadGasMarket = jest.fn().mockResolvedValue([
    {
      level: 'normal',
      price: 90,
      priority_price: 80,
      front_tx_count: 0,
      estimated_seconds: 1,
      base_fee: 0,
    },
    {
      level: 'custom',
      price: 100,
      priority_price: 70,
      front_tx_count: 0,
      estimated_seconds: 1,
      base_fee: 0,
    },
  ]);
  const tx = {
    chainId: 1,
    from: '0xfrom',
    to: '0xto',
    data: '0x',
    value: '0x0',
  } as any;

  const result = await prepareInitialGasSelection({
    tx,
    chainId: 1,
    support1559: true,
    isSend: true,
    lastTimeGas: null,
    loadGasMarket,
  });

  expect(loadGasMarket).toHaveBeenCalledWith(0);
  expect(result.gas.level).toBe('normal');
  expect(result.tx).toMatchObject({
    maxFeePerGas: '0x5a',
    maxPriorityFeePerGas: '0x5a',
  });
  expect(result.tx).not.toHaveProperty('gasPrice');
});

test('prepareInitialGasSelection preserves cached and dapp gas precedence', async () => {
  const gasList = [
    {
      level: 'normal',
      price: 90,
      priority_price: 80,
      front_tx_count: 0,
      estimated_seconds: 1,
      base_fee: 0,
    },
    {
      level: 'custom',
      price: 100,
      priority_price: 60,
      front_tx_count: 0,
      estimated_seconds: 1,
      base_fee: 0,
    },
  ];
  const loadGasMarket = jest.fn().mockResolvedValue(gasList);
  const baseTx = {
    chainId: 1,
    from: '0xfrom',
    to: '0xto',
    data: '0x',
    value: '0x0',
  } as any;

  const cached = await prepareInitialGasSelection({
    tx: baseTx,
    chainId: 1,
    support1559: false,
    lastTimeGas: {
      lastTimeSelect: 'gasPrice',
      gasPrice: 100,
      maxPriorityFee: 70,
    } as any,
    loadGasMarket,
  });
  expect(cached.gas.level).toBe('custom');
  expect(cached.gas.priority_price).toBe(70);
  expect(cached.tx.gasPrice).toBe('0x64');
  // Only the selected level carries the cached priority fee - the returned
  // list is the raw market list, which is what the gas selector renders.
  expect(cached.gasList).toBe(gasList);
  expect(cached.gasList[1].priority_price).toBe(60);

  loadGasMarket.mockClear();
  const dappGas = await prepareInitialGasSelection({
    tx: { ...baseTx, gasPrice: '0x78' },
    chainId: 1,
    support1559: false,
    isSend: true,
    lastTimeGas: {
      lastTimeSelect: 'gasLevel',
      gasLevel: 'normal',
      gasPrice: 100,
      maxPriorityFee: 70,
    } as any,
    loadGasMarket,
  });
  expect(loadGasMarket).toHaveBeenCalledWith(120);
  expect(dappGas.gas.level).toBe('custom');
  expect(dappGas.tx.gasPrice).toBe('0x64');
});

test('prepareInitialGasSelection rejects when gas market fails', async () => {
  const error = new Error('gas market unavailable');

  await expect(
    prepareInitialGasSelection({
      tx: { chainId: 1, from: '0xfrom' } as any,
      chainId: 1,
      support1559: true,
      lastTimeGas: null,
      loadGasMarket: jest.fn().mockRejectedValue(error),
    })
  ).rejects.toBe(error);
});

describe('buildSignTx', () => {
  // Verbatim copy of the construction SignTx used before it was extracted.
  // buildSignTx must keep producing exactly this - it decides what the user
  // sees and signs.
  const legacySignTxConstruction = (rawTx: any, chainId: number) => {
    const {
      data = '0x',
      from,
      type,
      calls,
      gas,
      gasPrice,
      nonce,
      to,
      value,
      feeToken,
      maxFeePerGas,
      authorizationList,
      feePayer,
      feePayerSignature,
      nonceKey,
      keyAuthorization,
      validBefore,
      validAfter,
    } = normalizeTxParams(rawTx, true) as any;
    const enable7702 = false;
    const getGasPrice = () => {
      let result = '';
      if (maxFeePerGas) {
        result = isHexString(maxFeePerGas)
          ? maxFeePerGas
          : intToHex(maxFeePerGas);
      }
      if (gasPrice) {
        result = isHexString(gasPrice)
          ? gasPrice
          : intToHex(parseInt(gasPrice));
      }
      if (Number.isNaN(Number(result))) {
        result = '';
      }
      return result;
    };
    return omit(
      {
        chainId,
        data: data || '0x',
        from,
        gas: gas || rawTx.gasLimit,
        gasPrice: getGasPrice(),
        nonce,
        to,
        value,
        type,
        calls,
        feeToken,
        maxFeePerGas,
        feePayer,
        feePayerSignature,
        nonceKey,
        keyAuthorization,
        validBefore,
        validAfter,
        authorizationList,
      },
      ['authorizationList']
    );
  };

  const cases: Record<string, any> = {
    '1559 dapp tx': {
      from: '0xfrom',
      to: '0xto',
      data: '0xdeadbeef',
      value: '0x0',
      chainId: '0x1',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x5f5e100',
    },
    'legacy dapp tx with gasLimit': {
      from: '0xfrom',
      to: '0xto',
      data: '0xdeadbeef',
      value: '0x0',
      chainId: '0x89',
      gasLimit: 21000,
      gasPrice: '0x3b9aca00',
    },
    'bare tx, no gas fields': {
      from: '0xfrom',
      to: '0xto',
      chainId: 1,
    },
  };

  Object.entries(cases).forEach(([name, rawTx]) => {
    test(`matches the pre-extraction construction: ${name}`, () => {
      const chainId = Number(rawTx.chainId);
      expect(
        buildSignTx({
          tx: normalizeTxParams(rawTx, true) as any,
          chainId,
          gasLimit: rawTx.gasLimit,
        })
      ).toEqual(legacySignTxConstruction(rawTx, chainId));
    });
  });

  test('buildSignTx preserves the expected dapp fee fields', () => {
    // These three used to differ between rpcFlow and SignTx, which made the
    // prepared pre-exec result describe a different tx than the signed one.
    const rawTx = cases['1559 dapp tx'];
    const tx = buildSignTx({
      tx: normalizeTxParams(rawTx, true) as any,
      chainId: Number(rawTx.chainId),
    }) as any;

    expect(tx.chainId).toBe(1);
    expect(tx.gasPrice).toBe('0x3b9aca00');
    expect(tx.maxPriorityFeePerGas).toBeUndefined();
  });
});
