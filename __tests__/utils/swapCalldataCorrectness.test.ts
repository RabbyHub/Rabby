import { BigNumber, utils } from 'ethers';
import { decodeCalldata } from '@/utils/swapCalldata';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import {
  validateCalldataResult,
  verifyCalldata,
} from '@/utils/swapCalldata/verify';
import { getComparableUniInputAmount } from '@/utils/swapCalldata/uni/assets';
import amountRegressions from '../fixtures/swap-calldata/amount-validation-2026-10-19.json';
import arcRegressions from '../fixtures/swap-calldata/arc-native-regressions-2026-10-19.json';
import uniQuote from '../fixtures/swap-calldata/uni-arbitrum-usdt0-to-usdc-v4.json';
import v2Handoffs from '../fixtures/swap-calldata/uni-v2-handoffs-2026-10-20.json';

const inputToken = '0x1111111111111111111111111111111111111111';
const outputToken = '0x2222222222222222222222222222222222222222';
const sender = '0x3333333333333333333333333333333333333333';
const intermediateToken = '0x4444444444444444444444444444444444444444';
// Ethereum V2 pair for intermediateToken / outputToken, independently derived
// from the official factory and CREATE2 init-code hash.
const intermediateV2Pair = '0x1b6af76ac6dd76c3894c665f40a817c02fe70b8a';
const refundReceiver = '0x5555555555555555555555555555555555555555';
const router = '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af';
const addressThis = '0x0000000000000000000000000000000000000002';
const zero = '0x0000000000000000000000000000000000000000';
const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const contractBalance = '0x8' + '0'.repeat(63);
const encode = utils.defaultAbiCoder.encode.bind(utils.defaultAbiCoder);
const universal = new utils.Interface([
  'function execute(bytes commands,bytes[] inputs,uint256 deadline)',
]);
const expected = {
  fromToken: inputToken,
  fromTokenAmount: '100',
  toToken: outputToken,
  minReceiveToTokenAmount: '90',
  toTokenReceiver: sender,
};

const decode = (data: string, value = '0') => {
  const result = decodeCalldata('Uniswap', {
    data,
    value,
    from: sender,
    to: router,
    chainId: 1,
  });
  return (
    result && {
      ...result,
      fromToken: result.fromToken.toLowerCase(),
      toToken: result.toToken.toLowerCase(),
      toTokenReceiver: result.toTokenReceiver.toLowerCase(),
    }
  );
};
const execute = (commands: string, inputs: string[], value = '0') =>
  decode(
    universal.encodeFunctionData('execute', [commands, inputs, 2000000000]),
    value
  );
const amm = (
  from = inputToken,
  to = outputToken,
  amountIn = '100',
  minimum = '90',
  recipient = addressThis,
  payerIsUser = true
) =>
  encode(
    ['address', 'uint256', 'uint256', 'address[]', 'bool'],
    [recipient, amountIn, minimum, [from, to], payerIsUser]
  );
const payment = (token: string, recipient: string, amount: string) =>
  encode(['address', 'address', 'uint256'], [token, recipient, amount]);
const v4Plan = (actions: string, inputs: string[]) =>
  encode(['bytes', 'bytes[]'], [actions, inputs]);
const v4Single = (
  from = inputToken,
  to = outputToken,
  amount = '100',
  minimum = '90'
) => {
  const zeroForOne = from.toLowerCase() < to.toLowerCase();
  return encode(
    [
      'tuple(tuple(address,address,uint24,int24,address),bool,uint128,uint128,bytes)',
    ],
    [
      [
        [...(zeroForOne ? [from, to] : [to, from]), 3000, 60, zero],
        zeroForOne,
        amount,
        minimum,
        '0x',
      ],
    ]
  );
};
const settle = (currency: string, amount = '0', payerIsUser = true) =>
  encode(['address', 'uint256', 'bool'], [currency, amount, payerIsUser]);

// Expected values below are literal payment amounts / independently summed
// user payouts. No expected field is obtained from a production decoder helper.
describe('Uni payment semantics and complete decoded results', () => {
  it.each([addressThis, router])(
    'ignores UNWRAP paid back to the router (%s)',
    (recipient) => {
      expect(
        execute('0x08040c', [
          amm(),
          payment(outputToken, sender, '90'),
          encode(['address', 'uint256'], [recipient, 0]),
        ])
      ).toEqual(expected);
    }
  );

  it.each(['0', '1'])(
    'keeps an ERC20 payout when native input is refunded (minimum %s)',
    (minimum) => {
      expect(
        execute(
          '0x0b08040c',
          [
            encode(['address', 'uint256'], [addressThis, 100]),
            amm(weth, outputToken, '95', '90', addressThis, false),
            payment(outputToken, sender, '90'),
            encode(['address', 'uint256'], [refundReceiver, minimum]),
          ],
          '100'
        )
      ).toEqual({ ...expected, fromToken: 'eth' });
    }
  );

  it('keeps an actual native output and its final recipient', () => {
    expect(
      execute('0x080c', [
        amm(inputToken, weth),
        encode(['address', 'uint256'], [sender, 90]),
      ])
    ).toEqual({ ...expected, toToken: 'eth' });
  });

  it.each([
    { amount: '70', minimum: '70' },
    { amount: '0', minimum: '0' },
    { amount: contractBalance, minimum: '90' },
  ])('uses the actual TRANSFER amount: $amount', ({ amount, minimum }) => {
    expect(
      execute('0x0805', [amm(), payment(outputToken, sender, amount)])
    ).toEqual({ ...expected, minReceiveToTokenAmount: minimum });
  });

  it.each(['70', '0'])(
    'distinguishes an explicit V4 TAKE from OPEN_DELTA (%s)',
    (amount) => {
      const swap = encode(
        [
          'tuple(tuple(address,address,uint24,int24,address),bool,uint128,uint128,bytes)',
        ],
        [[[inputToken, outputToken, 3000, 60, zero], true, 100, 90, '0x']]
      );
      const v4 = encode(
        ['bytes', 'bytes[]'],
        [
          '0x060b0e0e',
          [
            swap,
            encode(['address', 'uint256', 'bool'], [inputToken, 100, true]),
            payment(outputToken, sender, amount),
            payment(outputToken, addressThis, '0'),
          ],
        ]
      );
      expect(execute('0x10', [v4])).toEqual({
        ...expected,
        minReceiveToTokenAmount: amount === '0' ? '90' : amount,
      });
    }
  );

  it.each([false, true])(
    'sums direct output across interleaved split routes (direct first: %s)',
    (directFirst) => {
      const direct = amm(inputToken, outputToken, '40', '36', sender);
      const branch = [
        amm(inputToken, intermediateToken, '60', '50'),
        amm(intermediateToken, outputToken, '50', '54', sender, false),
      ];
      expect(
        execute(
          '0x080808',
          directFirst ? [direct, ...branch] : [...branch, direct]
        )
      ).toEqual(expected);
    }
  );

  it.each(['0', contractBalance])(
    'keeps a V4-to-V2 pair handoff out of the final payout (amountIn %s)',
    (amountIn) => {
      const v4 = encode(
        ['bytes', 'bytes[]'],
        [
          '0x060b0e',
          [
            encode(
              [
                'tuple(tuple(address,address,uint24,int24,address),bool,uint128,uint128,bytes)',
              ],
              [
                [
                  [inputToken, intermediateToken, 3000, 60, zero],
                  true,
                  100,
                  50,
                  '0x',
                ],
              ]
            ),
            encode(['address', 'uint256', 'bool'], [inputToken, 100, true]),
            payment(intermediateToken, intermediateV2Pair, '0'),
          ],
        ]
      );
      expect(
        execute('0x1008', [
          v4,
          amm(intermediateToken, outputToken, amountIn, '90', sender, false),
        ])
      ).toEqual(expected);
    }
  );

  it.each(['0', contractBalance])(
    'retains a real external recipient before V2 (amountIn %s)',
    (amountIn) => {
      expect(() =>
        execute('0x0808', [
          amm(inputToken, intermediateToken, '100', '50', refundReceiver),
          amm(intermediateToken, outputToken, amountIn, '90', sender, false),
        ])
      ).toThrow('Multiple output assets or recipients');
    }
  );

  it('does not consume a different token paid to the matching V2 pair', () => {
    expect(() =>
      execute('0x0808', [
        amm(inputToken, weth, '100', '50', intermediateV2Pair),
        amm(
          intermediateToken,
          outputToken,
          contractBalance,
          '90',
          sender,
          false
        ),
      ])
    ).toThrow('Multiple output assets or recipients');
  });

  it('keeps a directly paid branch separate from a later balance transfer', () => {
    expect(
      execute('0x080805', [
        amm(inputToken, outputToken, '40', '36', sender),
        amm(inputToken, outputToken, '60', '54'),
        payment(outputToken, sender, contractBalance),
      ])
    ).toEqual(expected);
  });

  it('does not count a reused router input as another user debit', () => {
    expect(
      execute('0x080808', [
        amm(inputToken, intermediateToken, '100', '80'),
        amm(intermediateToken, inputToken, '80', '60', addressThis, false),
        amm(inputToken, outputToken, '60', '90', sender, false),
      ])
    ).toEqual(expected);
  });

  it('reports multiple final receivers instead of returning just the last one', () => {
    expect(() =>
      execute('0x0808', [
        amm(inputToken, outputToken, '40', '36', sender),
        amm(inputToken, outputToken, '60', '54', refundReceiver),
      ])
    ).toThrow('Multiple output assets or recipients');
  });
});

describe('2026-10-20 real Uni V2 handoff regressions', () => {
  it('retains all 16 original failures across Polygon, Tempo and Ethereum', () => {
    expect(v2Handoffs.cases.map((sample) => sample.recordId)).toEqual([
      1906,
      1908,
      1910,
      1912,
      1914,
      1918,
      1920,
      2593,
      2603,
      2613,
      3204,
      3223,
      3242,
      3568,
      3570,
      3572,
    ]);
    expect(new Set(v2Handoffs.cases.map(({ record }) => record.chain))).toEqual(
      new Set(['POLYGON', 'TEMPO', 'ETH'])
    );
    v2Handoffs.cases.forEach(({ record }) => {
      expect(record.status).toBe('failed');
      expect(record.firstFailedStep).toBe('decode.uni.result');
    });
  });

  it.each(v2Handoffs.cases)(
    '$name / record $recordId',
    ({ record, expected }) => {
      const tx = { ...record.quote.tx, chainId: record.chainId };
      const decoded = decodeCalldata('Uniswap', tx, {
        nativeTokenAddress: record.request.nativeTokenAddress,
      })!;
      // Pin every field to ingress and terminal SWEEP, not production helpers.
      expect({
        ...decoded,
        fromToken: decoded.fromToken.toLowerCase(),
        toToken: decoded.toToken.toLowerCase(),
        toTokenReceiver: decoded.toTokenReceiver.toLowerCase(),
      }).toEqual(expected);
      const { origin: _origin, ...quote } = record.quote;
      const validation = validateCalldataResult({
        dexId: DEX_ENUM.UNI,
        tx,
        decoded,
        data: quote,
        nativeTokenAddress: record.request.nativeTokenAddress,
        userAddress: record.request.userAddress,
        slippage: String(Number(record.request.slippage) / 100),
      });
      expect(validation?.passed).toBe(true);
      expect(validation?.checks).toEqual({
        fromToken: true,
        fromTokenAmount: true,
        toToken: true,
        minReceiveToTokenAmount: true,
        toTokenReceiver: true,
      });
    }
  );
});

describe('Uni recipient execution context', () => {
  const { origin: _origin, ...validationQuote } = uniQuote.quote;
  const msgSender = '0x0000000000000000000000000000000000000001';
  const proxyAddress = '0x02e5be68d46dac0b524905bff209cf47ee6db2a9';
  const proxy = new utils.Interface([
    'function execute(address router,address token,uint256 amount,bytes commands,bytes[] inputs,uint256 deadline)',
  ]);
  const transaction = (
    commands: string,
    inputs: string[],
    proxied: boolean
  ) => ({
    from: sender,
    to: proxied ? proxyAddress : router,
    chainId: 1,
    value: '0',
    data: proxied
      ? proxy.encodeFunctionData('execute', [
          router,
          inputToken,
          100,
          commands,
          inputs,
          2000000000,
        ])
      : universal.encodeFunctionData('execute', [commands, inputs, 2000000000]),
  });

  // SwapProxy's official contract requires explicit user recipients:
  // MSG_SENDER resolves to the proxy inside Universal Router execution.
  // https://github.com/Uniswap/universal-router/blob/main/contracts/SwapProxy.sol
  describe.each([
    {
      name: 'direct MSG_SENDER',
      proxied: false,
      recipient: msgSender,
      receiver: sender,
    },
    {
      name: 'proxy MSG_SENDER',
      proxied: true,
      recipient: msgSender,
      receiver: proxyAddress,
    },
    {
      name: 'proxy explicit user',
      proxied: true,
      recipient: sender,
      receiver: sender,
    },
  ])('$name', ({ proxied, recipient, receiver }) => {
    it.each([
      {
        name: 'V2 swap',
        commands: '0x08',
        inputs: [
          amm(inputToken, outputToken, '100', '90', recipient, !proxied),
        ],
        toToken: outputToken,
      },
      {
        name: 'V3 swap',
        commands: '0x00',
        inputs: [
          encode(
            ['address', 'uint256', 'uint256', 'bytes', 'bool'],
            [
              recipient,
              100,
              90,
              utils.solidityPack(
                ['address', 'uint24', 'address'],
                [inputToken, 3000, outputToken]
              ),
              !proxied,
            ]
          ),
        ],
        toToken: outputToken,
      },
      ...['SWEEP', 'TRANSFER'].map((name) => ({
        name,
        commands: name === 'SWEEP' ? '0x0804' : '0x0805',
        inputs: [
          amm(inputToken, outputToken, '100', '90', addressThis, !proxied),
          payment(outputToken, recipient, '90'),
        ],
        toToken: outputToken,
      })),
      {
        name: 'UNWRAP_WETH',
        commands: '0x080c',
        inputs: [
          amm(inputToken, weth, '100', '90', addressThis, !proxied),
          encode(['address', 'uint256'], [recipient, 90]),
        ],
        toToken: 'eth',
      },
      {
        name: 'V4 TAKE',
        commands: '0x10',
        inputs: [
          v4Plan('0x060b0e', [
            v4Single(),
            settle(inputToken, '100', !proxied),
            payment(outputToken, recipient, '0'),
          ]),
        ],
        toToken: outputToken,
      },
    ])(
      'resolves $name and verifies the actual recipient',
      ({ commands, inputs, toToken }) => {
        const tx = transaction(commands, inputs, proxied);
        const decoded = decodeCalldata('Uniswap', tx)!;
        expect(decoded).toEqual({
          ...expected,
          toToken,
          toTokenReceiver: receiver,
        });
        expect(
          validateCalldataResult({
            dexId: DEX_ENUM.UNI,
            tx,
            decoded,
            data: {
              ...validationQuote,
              fromToken: inputToken,
              fromTokenAmount: '100',
              toToken,
              toTokenAmount: '90',
            },
            userAddress: sender,
            nativeTokenAddress: 'eth',
            slippage: '0',
          })?.checks.toTokenReceiver
        ).toBe(receiver === sender);
      }
    );
  });

  it.each([false, true])(
    'resolves the implicit V4 TAKE_ALL caller (proxy: %s)',
    (proxied) => {
      const tx = transaction(
        '0x10',
        [
          v4Plan('0x060b0f', [
            v4Single(),
            settle(inputToken, '100', !proxied),
            encode(['address', 'uint256'], [outputToken, 90]),
          ]),
        ],
        proxied
      );
      expect(decodeCalldata('Uniswap', tx)).toEqual({
        ...expected,
        toTokenReceiver: proxied ? proxyAddress : sender,
      });
    }
  );

  it.each(['router', 'pool'])(
    'does not count a %s portion paid to the proxy as user output',
    (source) => {
      const tx =
        source === 'router'
          ? transaction(
              '0x080605',
              [
                amm(inputToken, outputToken, '100', '100', addressThis, false),
                payment(outputToken, msgSender, '1000'),
                payment(outputToken, sender, contractBalance),
              ],
              true
            )
          : transaction(
              '0x10',
              [
                v4Plan('0x060b100e', [
                  v4Single(inputToken, outputToken, '100', '100'),
                  settle(inputToken, '100', false),
                  payment(outputToken, msgSender, '1000'),
                  payment(outputToken, sender, '0'),
                ]),
              ],
              true
            );
      expect(decodeCalldata('Uniswap', tx)).toEqual(expected);
    }
  );

  it('does not merge proxy and user payouts into a single user recipient', () => {
    const tx = transaction(
      '0x0808',
      [
        amm(inputToken, outputToken, '40', '36', msgSender, false),
        amm(inputToken, outputToken, '60', '54', sender, false),
      ],
      true
    );
    expect(() => decodeCalldata('Uniswap', tx)).toThrow(
      'Multiple output assets or recipients'
    );
  });
});

describe('funding, intermediate balances and final payments', () => {
  it('does not silently omit a second user-funded input asset', () => {
    expect(() =>
      execute('0x0808', [
        amm(inputToken, outputToken, '40', '36', sender),
        amm(intermediateToken, outputToken, '60', '54', sender),
      ])
    ).toThrow('Multiple user-funded input assets');
  });

  it('rejects another direct user debit after a prepaid native input', () => {
    expect(() =>
      execute(
        '0x0b08',
        [
          encode(['address', 'uint256'], [addressThis, 100]),
          amm(weth, outputToken, '100', '90', sender, true),
        ],
        '100'
      )
    ).toThrow('Additional user-funded debit');
  });

  it('retains the complete native input across two separate wraps', () => {
    expect(
      execute(
        '0x0b080b0804',
        [
          encode(['address', 'uint256'], [addressThis, 40]),
          amm(weth, outputToken, '40', '36', addressThis, false),
          encode(['address', 'uint256'], [addressThis, 60]),
          amm(weth, outputToken, '60', '54', addressThis, false),
          payment(outputToken, sender, '90'),
        ],
        '100'
      )
    ).toEqual({ ...expected, fromToken: 'eth' });
  });

  it('subtracts a fee before a router-balance transfer', () => {
    expect(
      execute('0x080605', [
        amm(inputToken, outputToken, '100', '100'),
        payment(outputToken, refundReceiver, '1000'),
        payment(outputToken, sender, contractBalance),
      ])
    ).toEqual(expected);
  });

  it('counts a portion paid to the user as part of the final output', () => {
    expect(
      execute('0x080605', [
        amm(inputToken, outputToken, '100', '100'),
        payment(outputToken, sender, '1000'),
        payment(outputToken, sender, contractBalance),
      ])
    ).toEqual({ ...expected, minReceiveToTokenAmount: '100' });
  });

  it('keeps a portion of the prepaid input returned to the user as a refund', () => {
    const proxy = new utils.Interface([
      'function execute(address router,address token,uint256 amount,bytes commands,bytes[] inputs,uint256 deadline)',
    ]);
    expect(
      decodeCalldata('Uniswap', {
        from: sender,
        to: '0x02E5be68D46DAc0B524905bfF209cf47EE6dB2a9',
        chainId: 1,
        value: '0',
        data: proxy.encodeFunctionData('execute', [
          router,
          inputToken,
          100,
          '0x080604',
          [
            amm(inputToken, outputToken, '80', '90', addressThis, false),
            payment(inputToken, sender, '5000'),
            payment(outputToken, sender, '90'),
          ],
          2000000000,
        ]),
      })
    ).toEqual(expected);
  });

  it('does not take the same V4 pool credit twice after moving it to the router', () => {
    expect(
      execute('0x10', [
        v4Plan('0x060b0e0e', [
          v4Single(),
          settle(inputToken, '100'),
          payment(outputToken, addressThis, '0'),
          payment(outputToken, sender, '0'),
        ]),
      ])
    ).toEqual({ ...expected, minReceiveToTokenAmount: '0' });
  });

  it('subtracts a pool-credit portion before taking the remaining output', () => {
    expect(
      execute('0x10', [
        v4Plan('0x060b100e', [
          v4Single(inputToken, outputToken, '100', '100'),
          settle(inputToken, '100'),
          payment(outputToken, refundReceiver, '1000'),
          payment(outputToken, sender, '0'),
        ]),
      ])
    ).toEqual(expected);
  });

  it('retains a fixed prepaid budget when V4 returns and reuses the input asset', () => {
    const plan = v4Plan('0x0606060b0e', [
      v4Single(inputToken, intermediateToken, '100', '80'),
      v4Single(intermediateToken, inputToken, '0', '60'),
      v4Single(inputToken, outputToken, '60', '90'),
      settle(inputToken, '100', false),
      payment(outputToken, sender, '0'),
    ]);
    const proxy = new utils.Interface([
      'function execute(address router,address token,uint256 amount,bytes commands,bytes[] inputs,uint256 deadline)',
    ]);
    expect(
      decodeCalldata('Uniswap', {
        from: sender,
        to: '0x02E5be68D46DAc0B524905bfF209cf47EE6dB2a9',
        chainId: 1,
        value: '0',
        data: proxy.encodeFunctionData('execute', [
          router,
          inputToken,
          100,
          '0x10',
          [plan],
          2000000000,
        ]),
      })
    ).toEqual(expected);
  });

  it('rejects state-dependent net input when V4 returns the input asset without prepayment', () => {
    expect(() =>
      execute('0x10', [
        v4Plan('0x06060b0e', [
          v4Single(inputToken, intermediateToken, '100', '80'),
          v4Single(intermediateToken, inputToken, '0', '60'),
          settle(inputToken, '0'),
          payment(inputToken, sender, '0'),
        ]),
      ])
    ).toThrow('net user input depends on pool deltas');
  });

  it('supports a fixed user settlement before the OPEN_DELTA swap', () => {
    expect(
      execute('0x10', [
        v4Plan('0x0b060e', [
          settle(inputToken, '100'),
          v4Single(inputToken, outputToken, '0', '90'),
          payment(outputToken, sender, '0'),
        ]),
      ])
    ).toEqual(expected);
  });

  it('sums separate user-funded roots even when the first debt was already settled', () => {
    expect(
      execute('0x1005', [
        v4Plan('0x060b0e060b0e', [
          v4Single(inputToken, outputToken, '40', '36'),
          settle(inputToken, '40'),
          payment(outputToken, addressThis, '0'),
          v4Single(inputToken, outputToken, '60', '54'),
          settle(inputToken, '60'),
          payment(outputToken, sender, '0'),
        ]),
        payment(outputToken, sender, contractBalance),
      ])
    ).toEqual(expected);
  });

  it('does not use a router balance as V4 OPEN_DELTA pool credit', () => {
    expect(() =>
      execute('0x0810', [
        amm(inputToken, intermediateToken, '100', '80'),
        v4Plan('0x060b0e', [
          v4Single(intermediateToken, outputToken, '0', '90'),
          settle(intermediateToken, '0', false),
          payment(outputToken, sender, '0'),
        ]),
      ])
    ).toThrow('OPEN_DELTA input has no preceding pool credit');
  });

  it('keeps a real external payout when a later router-funded V3 swap reuses that asset', () => {
    expect(() =>
      execute('0x1000', [
        v4Plan('0x060b0e', [
          v4Single(inputToken, intermediateToken, '100', '50'),
          settle(inputToken, '100'),
          payment(intermediateToken, refundReceiver, '0'),
        ]),
        encode(
          ['address', 'uint256', 'uint256', 'bytes', 'bool'],
          [
            sender,
            50,
            90,
            utils.solidityPack(
              ['address', 'uint24', 'address'],
              [intermediateToken, 3000, outputToken]
            ),
            false,
          ]
        ),
      ])
    ).toThrow('Multiple output assets or recipients');
  });

  it.each([
    ['0x0d', encode(['address', 'address'], [inputToken, outputToken])],
    [
      '0x11',
      encode(
        ['address', 'address', 'address'],
        [inputToken, outputToken, sender]
      ),
    ],
    ['0x12', encode(['address'], [outputToken])],
    ['0x14', encode(['address', 'address'], [outputToken, sender])],
    ['0x16', encode(['uint256'], [0])],
  ])(
    'rejects unmodeled V4 payment action %s instead of ignoring it',
    (action, data) => {
      expect(() =>
        execute('0x10', [
          v4Plan(`0x060b${action.slice(2)}`, [
            v4Single(),
            settle(inputToken, '100'),
            data,
          ]),
        ])
      ).toThrow('Unsupported V4 action');
    }
  );
});

describe('contract-defined input amount comparison', () => {
  it.each(
    amountRegressions.cases.filter(({ record }) => record.dex === 'Uniswap')
  )(
    'verifies recorded $record.dex input amount (record $record.id)',
    ({ record, expected }) => {
      const tx = { ...record.quote.tx, chainId: record.chainId };
      const decoded = decodeCalldata(record.dex, tx, {
        nativeTokenAddress: record.request.nativeTokenAddress,
      });
      // Expected fields are pinned from the raw input and route amounts.
      // Keep original quotes and historical check results unchanged.
      expect(decoded).toEqual(expected);
      const { origin: _origin, ...quote } = record.quote;
      const params = {
        dexId: record.dex as DEX_ENUM,
        data: quote,
        decoded,
        tx,
        slippage: '0.01',
        nativeTokenAddress: record.request.nativeTokenAddress,
      };
      expect(verifyCalldata(params)).toBe(true);
      expect(verifyCalldata({ ...params, decoded: null })).toBe(false);
      expect(validateCalldataResult(params)?.passed).toBe(true);
      expect(
        validateCalldataResult({
          ...params,
          decoded: { ...decoded, toToken: zero },
        })?.checks.toToken
      ).toBe(false);
      expect(
        validateCalldataResult({
          ...params,
          decoded: {
            ...decoded,
            minReceiveToTokenAmount: BigNumber.from(
              decoded.minReceiveToTokenAmount
            )
              .div(2)
              .toString(),
          },
        })?.checks.minReceiveToTokenAmount
      ).toBe(false);
      // Correct fee/precision handling must not accept a wrong parsed amount.
      expect(
        verifyCalldata({
          ...params,
          decoded: {
            ...decoded,
            fromTokenAmount: BigNumber.from(decoded.fromTokenAmount)
              .add(1)
              .toString(),
          },
        })
      ).toBe(false);
      expect(decoded).toEqual(expected);
    }
  );

  it('keeps exact native amounts and limits truncation to Arc native USDC', () => {
    const requested = '19977999999999998249';
    const truncated = '19977999000000000000';
    const decoded = {
      ...expected,
      fromToken: 'arc',
      fromTokenAmount: truncated,
    };
    expect(getComparableUniInputAmount(requested, decoded, 5042, 'arc')).toBe(
      truncated
    );
    expect(getComparableUniInputAmount(requested, decoded, 1, 'arc')).toBe(
      requested
    );
    expect(
      getComparableUniInputAmount(
        requested,
        { ...decoded, fromToken: inputToken },
        5042,
        'arc'
      )
    ).toBe(requested);
    expect(
      getComparableUniInputAmount(
        requested,
        { ...decoded, fromTokenAmount: requested },
        5042,
        'arc'
      )
    ).toBe(requested);
  });
});

describe('Arc native USDC splits and refunds', () => {
  it.each(arcRegressions.cases)(
    'decodes and verifies every result field (record $record.id)',
    ({ record, expected, evidence }) => {
      // Sum the independently read V3/V4 root legs, not the decoder's output.
      expect(
        evidence.rootInputAmounts6
          .reduce((sum, amount) => sum.add(amount), BigNumber.from(0))
          .mul('1000000000000')
          .toString()
      ).toBe(expected.fromTokenAmount);
      const tx = { ...record.quote.tx, chainId: record.chainId };
      const decoded = decodeCalldata(record.dex, tx, {
        nativeTokenAddress: record.request.nativeTokenAddress,
      });
      expect(decoded).toEqual(expected);
      const { origin: _origin, ...quote } = record.quote;
      const validation = validateCalldataResult({
        dexId: DEX_ENUM.UNI,
        data: {
          ...quote,
          fromToken: record.request.fromToken,
          fromTokenAmount: record.request.fromTokenAmount,
          toToken: record.request.toToken,
        },
        tx,
        decoded,
        nativeTokenAddress: record.request.nativeTokenAddress,
        userAddress: record.request.userAddress,
        slippage: String(Number(record.request.slippage) / 100),
      });
      expect(validation?.passed).toBe(true);
      expect(validation?.checks).toEqual({
        fromToken: true,
        fromTokenAmount: true,
        toToken: true,
        minReceiveToTokenAmount: true,
        toTokenReceiver: true,
      });
    }
  );
});
