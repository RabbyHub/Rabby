import { BigNumber, utils } from 'ethers';
import { decodeCalldata } from '@/utils/swapCalldata';

const inputToken = '0x1111111111111111111111111111111111111111';
const outputToken = '0x2222222222222222222222222222222222222222';
const sender = '0x3333333333333333333333333333333333333333';
const intermediateToken = '0x4444444444444444444444444444444444444444';
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

  it('keeps a V4-to-V2 pair handoff out of the final payout', () => {
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
          payment(intermediateToken, refundReceiver, '0'),
        ],
      ]
    );
    expect(
      execute('0x1008', [
        v4,
        amm(
          intermediateToken,
          outputToken,
          contractBalance,
          '90',
          sender,
          false
        ),
      ])
    ).toEqual(expected);
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

describe('Magpie DexAggregator field correctness', () => {
  const method = 'swapWithBackendSignature';
  const abi = new utils.Interface([`function ${method}(bytes)`]);

  it.each([0, 1, 7, 8, 127, 128, 248, 255])(
    'preserves integer precision and pointer bytes with shift %s',
    (shift) => {
      const bits = 256 - shift;
      const amountIn = BigNumber.from(2).pow(bits - 1);
      const minimum = BigNumber.from(2).pow(bits).sub(1);
      const packed = new Uint8Array(320);
      const put = (offset: number, value: string) =>
        packed.set(utils.arrayify(value), offset - 68);
      const uint = (offset: number, value: BigNumber | number, bytes = 32) =>
        put(
          offset,
          utils.hexZeroPad(BigNumber.from(value).toHexString(), bytes)
        );
      const compact = (offset: number, pointer: number, value: BigNumber) => {
        uint(offset, shift, 1);
        uint(offset + 1, pointer, 2);
        // Low bits deliberately contain nonzero noise that Solidity shr drops.
        uint(pointer, value.shl(shift).or(BigNumber.from(2).pow(shift).sub(1)));
      };
      put(72, refundReceiver);
      put(92, inputToken);
      put(112, outputToken);
      uint(132, amountIn);
      compact(167, 320, minimum);
      const result = decodeCalldata('Magpie', {
        data: abi.encodeFunctionData(method, [packed]),
        from: sender,
        to: router,
        chainId: 1,
        value: '0',
      });
      expect(result).toEqual({
        fromToken: inputToken,
        fromTokenAmount: amountIn.toString(),
        toToken: outputToken,
        minReceiveToTokenAmount: minimum.toString(),
        toTokenReceiver: refundReceiver,
      });
    }
  );
});
