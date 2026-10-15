import { utils } from 'ethers';
import { CalldataDecodeError, decodeCalldata } from '@/utils/swapCalldata';
import magpieQuote from '../fixtures/swap-calldata/magpie-arbitrum-backend-signature.json';

const fromToken = '0x1111111111111111111111111111111111111111';
const toToken = '0x2222222222222222222222222222222222222222';
const sender = '0x3333333333333333333333333333333333333333';
const zero = '0x0000000000000000000000000000000000000000';
const msgSender = '0x0000000000000000000000000000000000000001';
const v2Router = '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af';
const universal = new utils.Interface([
  'function execute(bytes commands,bytes[] inputs,uint256 deadline)',
  'function executeSigned(bytes commands,bytes[] inputs,bytes32 intent,bytes32 data,bool verifySender,bytes32 nonce,bytes signature,uint256 deadline)',
]);
const encode = utils.defaultAbiCoder.encode.bind(utils.defaultAbiCoder);
const transaction = (data: string, to = v2Router) => ({
  from: sender,
  to,
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

// Encode independently using the official SDK's dynamic swap structs.
const poolKey = 'tuple(address,address,uint24,int24,address)';
const pathKey = 'tuple(address,uint24,int24,address,bytes)';
const v4Input = (newVersion: boolean, action: number) => {
  const single = action === 0x06 || action === 0x08;
  const exactOut = action === 0x08 || action === 0x09;
  const amountA = exactOut ? 90 : 100;
  const amountB = exactOut ? 100 : 90;
  let schema: string;
  let value: unknown[];
  if (single) {
    schema = `tuple(${poolKey},bool,uint128,uint128,${
      newVersion ? 'uint256,' : ''
    }bytes)`;
    value = [
      [fromToken, toToken, 3000, 60, zero],
      true,
      amountA,
      amountB,
      ...(newVersion ? [1] : []),
      '0x',
    ];
  } else {
    schema = `tuple(address,${pathKey}[],${
      newVersion ? 'uint256[],' : ''
    }uint128,uint128)`;
    value = [
      exactOut ? toToken : fromToken,
      [
        ['0x4444444444444444444444444444444444444444', 3000, 60, zero, '0x'],
        [exactOut ? fromToken : toToken, 3000, 60, zero, '0x'],
      ],
      ...(newVersion ? [[1, 1]] : []),
      amountA,
      amountB,
    ];
  }
  return encode(
    ['bytes', 'bytes[]'],
    [
      `0x${action.toString(16).padStart(2, '0')}0c0f`,
      [
        encode([schema], [value]),
        encode(['address', 'uint256'], [fromToken, 100]),
        encode(['address', 'uint256'], [toToken, 90]),
      ],
    ]
  );
};

const routerVersions = [
  { version: '2.0', address: v2Router, newVersion: false },
  {
    version: '2.1.1',
    address: '0x4C82D1fBFe28C977cBB58D8C7FF8FCF9F70a2cCA',
    newVersion: true,
  },
  {
    version: '2.1.2',
    address: '0x23617e59A5925b2A4Bf75d73ff6711cD0b29De85',
    newVersion: true,
  },
  {
    version: '2.2.0',
    address: '0xab863E752Bf67D8DCDD929EaAe9Be9dc83Fb3BbB',
    newVersion: true,
  },
];

describe.each(routerVersions)(
  'Universal Router $version',
  ({ address, newVersion }) => {
    it.each([
      { name: 'single exact input', action: 0x06 },
      { name: 'path exact input', action: 0x07 },
      { name: 'single exact output', action: 0x08 },
      { name: 'path exact output', action: 0x09 },
    ])(
      'decodes V4 $name with the correct input amount and currencies',
      ({ action }) => {
        const data = universal.encodeFunctionData('execute', [
          '0x10',
          [v4Input(newVersion, action)],
          2000000000,
        ]);
        expect(decodeCalldata('Uniswap', transaction(data, address))).toEqual(
          expected
        );
      }
    );
  }
);

describe('Universal Router entry points and version selection', () => {
  const ammInput = encode(
    ['address', 'uint256', 'uint256', 'bytes', 'bool'],
    [
      msgSender,
      100,
      90,
      utils.solidityPack(
        ['address', 'uint24', 'address'],
        [fromToken, 3000, toToken]
      ),
      true,
    ]
  );

  it.each([0x08, 0x09])(
    'keeps the V2 path direction for command %s',
    (command) => {
      const exactOut = command === 0x09;
      const input = encode(
        ['address', 'uint256', 'uint256', 'address[]', 'bool'],
        [
          msgSender,
          exactOut ? 90 : 100,
          exactOut ? 100 : 90,
          [fromToken, toToken],
          true,
        ]
      );
      const data = universal.encodeFunctionData('execute', [
        `0x0${command.toString(16)}`,
        [input],
        2000000000,
      ]);
      expect(decodeCalldata('Uniswap', transaction(data))).toEqual(expected);
    }
  );

  it('uses the 1.2 command mask instead of the newer 7-bit mask', () => {
    const data = universal.encodeFunctionData('execute', [
      '0x40',
      [ammInput],
      2000000000,
    ]);
    expect(
      decodeCalldata(
        'Uniswap',
        transaction(data, '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD')
      )
    ).toEqual(expected);
    expect(() =>
      decodeCalldata('Uniswap', transaction(data, routerVersions[1].address))
    ).toThrow('Unsupported command 0x40');
  });

  it('does not interpret a 1.2 Seaport command as a V4 swap', () => {
    const data = universal.encodeFunctionData('execute', [
      '0x10',
      [v4Input(false, 0x06)],
      2000000000,
    ]);
    expect(() =>
      decodeCalldata(
        'Uniswap',
        transaction(data, '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD')
      )
    ).toThrow('Seaport, not a V4 swap');
  });

  it('does not guess a version for an unknown router address', () => {
    const data = universal.encodeFunctionData('execute', [
      '0x00',
      [ammInput],
      2000000000,
    ]);
    expect(() => decodeCalldata('Uniswap', transaction(data, sender))).toThrow(
      'Unknown Universal Router version'
    );
  });

  it('selects the inner router version for SwapProxy calls', () => {
    const proxy = new utils.Interface([
      'function execute(address router,address token,uint256 amount,bytes commands,bytes[] inputs,uint256 deadline)',
    ]);
    const data = proxy.encodeFunctionData('execute', [
      routerVersions[1].address,
      fromToken,
      100,
      '0x10',
      [v4Input(true, 0x07)],
      2000000000,
    ]);
    expect(
      decodeCalldata(
        'Uniswap',
        transaction(data, '0x02E5be68D46DAc0B524905bfF209cf47EE6dB2a9')
      )
    ).toEqual(expected);
  });

  it('parses executeSigned while keeping MSG_SENDER tied to the transaction sender', () => {
    const data = universal.encodeFunctionData('executeSigned', [
      '0x00',
      [ammInput],
      utils.hexZeroPad('0x01', 32),
      utils.hexZeroPad('0x02', 32),
      false,
      utils.hexZeroPad('0x03', 32),
      '0x' + '11'.repeat(65),
      2000000000,
    ]);
    expect(
      decodeCalldata('Uniswap', transaction(data, routerVersions[1].address))
    ).toEqual(expected);
    expect(() => decodeCalldata('Uniswap', transaction(data))).toThrow(
      'executeSigned is not supported by Router 2.0'
    );
  });

  it('keeps the command index and version in a V4 decoding failure', () => {
    const brokenV4 = encode(['bytes', 'bytes[]'], ['0x06', ['0x']]);
    const data = universal.encodeFunctionData('execute', [
      '0x10',
      [brokenV4],
      2000000000,
    ]);
    expect(() => decodeCalldata('Uniswap', transaction(data))).toThrow(
      CalldataDecodeError
    );
    try {
      decodeCalldata('Uniswap', transaction(data));
    } catch (error) {
      expect((error as CalldataDecodeError).step).toBe(
        'decode.uni.universal.2.0.commands[0].0x10.v4.actions[0].0x06'
      );
    }
  });

  it('decodes nested sub-plans using the same router version', () => {
    const nested = encode(
      ['bytes', 'bytes[]'],
      ['0x10', [v4Input(true, 0x07)]]
    );
    const data = universal.encodeFunctionData('execute', [
      '0x21',
      [nested],
      2000000000,
    ]);
    expect(
      decodeCalldata('Uniswap', transaction(data, routerVersions[1].address))
    ).toEqual(expected);
  });

  it('rejects command/input length mismatches', () => {
    const data = universal.encodeFunctionData('execute', [
      '0x0000',
      [ammInput],
      2000000000,
    ]);
    expect(() => decodeCalldata('Uniswap', transaction(data))).toThrow(
      'Commands and inputs lengths differ'
    );
  });
});

describe.each([true, false])(
  'V3 SwapRouter with deadline in tuple: %s',
  (withDeadline) => {
    it.each([false, true])(
      'decodes a single-hop swap, exact output: %s',
      (exactOut) => {
        const method = exactOut ? 'exactOutputSingle' : 'exactInputSingle';
        const abi = new utils.Interface([
          `function ${method}(tuple(address,address,uint24,address,${
            withDeadline ? 'uint256,' : ''
          }uint256,uint256,uint160) params)`,
        ]);
        const values = [
          fromToken,
          toToken,
          3000,
          sender,
          ...(withDeadline ? [2000000000] : []),
          exactOut ? 90 : 100,
          exactOut ? 100 : 90,
          0,
        ];
        expect(
          decodeCalldata(
            'Uniswap',
            transaction(abi.encodeFunctionData(method, [values]))
          )
        ).toEqual(expected);
      }
    );

    it.each([false, true])(
      'decodes a path swap, exact output: %s',
      (exactOut) => {
        const method = exactOut ? 'exactOutput' : 'exactInput';
        const abi = new utils.Interface([
          `function ${method}(tuple(bytes,address,${
            withDeadline ? 'uint256,' : ''
          }uint256,uint256) params)`,
        ]);
        const path = utils.solidityPack(
          ['address', 'uint24', 'address'],
          [exactOut ? toToken : fromToken, 3000, exactOut ? fromToken : toToken]
        );
        const values = [
          path,
          sender,
          ...(withDeadline ? [2000000000] : []),
          exactOut ? 90 : 100,
          exactOut ? 100 : 90,
        ];
        expect(
          decodeCalldata(
            'Uniswap',
            transaction(abi.encodeFunctionData(method, [values]))
          )
        ).toEqual(expected);
      }
    );
  }
);

describe('traditional Router multicalls and native tokens', () => {
  const swap = new utils.Interface([
    'function exactInputSingle(tuple(address,address,uint24,address,uint256,uint256,uint160) params)',
  ]);

  it.each([
    { signature: 'multicall(bytes[] data)', prefix: [] },
    {
      signature: 'multicall(uint256 deadline,bytes[] data)',
      prefix: [2000000000],
    },
    {
      signature: 'multicall(bytes32 previousBlockhash,bytes[] data)',
      prefix: [utils.hexZeroPad('0x01', 32)],
    },
  ])(
    'decodes $signature and the final native-token recipient',
    ({ signature, prefix }) => {
      const multicall = new utils.Interface([`function ${signature}`]);
      const payments = new utils.Interface([
        'function unwrapWETH9(uint256 minimum,address recipient)',
      ]);
      const data = multicall.encodeFunctionData('multicall', [
        ...prefix,
        [
          swap.encodeFunctionData('exactInputSingle', [
            [fromToken, toToken, 3000, v2Router, 100, 90, 0],
          ]),
          payments.encodeFunctionData('unwrapWETH9', [90, sender]),
        ],
      ]);
      expect(decodeCalldata('Uniswap', transaction(data))).toEqual({
        ...expected,
        toToken: 'eth',
      });
    }
  );

  it('decodes native input on the traditional V2 Router', () => {
    const abi = new utils.Interface([
      'function swapExactETHForTokens(uint256,address[],address,uint256) payable',
    ]);
    const data = abi.encodeFunctionData('swapExactETHForTokens', [
      90,
      [toToken, fromToken],
      sender,
      2000000000,
    ]);
    expect(
      decodeCalldata('Uniswap', { ...transaction(data), value: '100' })
    ).toEqual({ ...expected, fromToken: 'eth', toToken: fromToken });
  });

  it('decodes V2 exact output inside SwapRouter02 without reversing its path', () => {
    const abi = new utils.Interface([
      'function swapTokensForExactTokens(uint256,uint256,address[],address)',
    ]);
    const data = abi.encodeFunctionData('swapTokensForExactTokens', [
      90,
      100,
      [fromToken, toToken],
      sender,
    ]);
    expect(decodeCalldata('Uniswap', transaction(data))).toEqual(expected);
  });
});

describe('Magpie V2 packed layout', () => {
  it.each(['swap', 'silentSwap'])(
    'decodes %s(bytes), summing its input amount pointers',
    (method) => {
      const abi = new utils.Interface([`function ${method}(bytes)`]);
      const packed = new Uint8Array(198);
      const put = (offset: number, value: string) =>
        packed.set(utils.arrayify(value), offset - 68);
      const uint = (offset: number, value: number, bytes = 32) =>
        put(offset, utils.hexZeroPad(utils.hexlify(value), bytes));
      uint(68, 190, 2);
      uint(70, 4, 2);
      uint(72, 40);
      uint(104, 1, 2);
      put(106, sender);
      put(126, fromToken);
      put(146, toToken);
      uint(166, 2000000000);
      uint(198, 90);
      uint(230, 60);
      uint(262, 72, 2);
      uint(264, 230, 2);
      expect(
        decodeCalldata(
          'Magpie',
          transaction(abi.encodeFunctionData(method, [packed]))
        )
      ).toEqual(expected);
    }
  );
});

describe('Magpie packed amount boundaries', () => {
  it('reads a compact value ending at the payload boundary like Solidity shr', () => {
    const abi = new utils.Interface([
      'function swapWithBackendSignature(bytes)',
    ]);
    const packed = new Uint8Array(220);
    const put = (offset: number, data: string) =>
      packed.set(utils.arrayify(data), offset - 68);
    put(72, sender);
    put(92, fromToken);
    put(112, toToken);
    put(132, utils.hexZeroPad('0x64', 32));
    put(167, '0xe8');
    put(168, utils.hexZeroPad(utils.hexlify(285), 2));
    put(285, utils.hexZeroPad('0x5a', 3));
    expect(
      decodeCalldata(
        'Magpie',
        transaction(
          abi.encodeFunctionData('swapWithBackendSignature', [packed])
        )
      )
    ).toEqual(expected);
  });

  it('reports the exact field for an out-of-bounds DexAggregator pointer', () => {
    const tx = magpieQuote.quote.tx;
    const data =
      tx.data.slice(0, 2 + 168 * 2) + 'ffff' + tx.data.slice(2 + 170 * 2);
    expect(() =>
      decodeCalldata('Magpie', { ...tx, chainId: magpieQuote.chainId, data })
    ).toThrow(CalldataDecodeError);
    try {
      decodeCalldata('Magpie', { ...tx, chainId: magpieQuote.chainId, data });
    } catch (error) {
      expect((error as CalldataDecodeError).step).toBe(
        'decode.magpie.dexAggregator.amountOutMin'
      );
    }
  });
});
