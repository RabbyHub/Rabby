import { utils } from 'ethers';
import {
  CalldataDecodeError,
  decodeCalldata,
  getCalldataVersion,
} from '@/utils/swapCalldata';
import magpieQuote from '../fixtures/swap-calldata/magpie-arbitrum-backend-signature.json';

const fromToken = '0x1111111111111111111111111111111111111111';
const toToken = '0x2222222222222222222222222222222222222222';
const sender = '0x3333333333333333333333333333333333333333';
const zero = '0x0000000000000000000000000000000000000000';
const msgSender = '0x0000000000000000000000000000000000000001';
const v2Router = '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af';
const arcRouter = '0x4fca4a51ab4f23a7447b3284fbd7d73289a89fb1';
const eraRouter = '0x28731bcc616b5f51dd52cf2e4df0e78dd1136c06';
const universal = new utils.Interface([
  'function execute(bytes commands,bytes[] inputs,uint256 deadline)',
]);
const encode = utils.defaultAbiCoder.encode.bind(utils.defaultAbiCoder);
const transaction = (data: string, to = v2Router, chainId = 1) => ({
  from: sender,
  to,
  value: '0',
  chainId,
  data,
});
const expected = {
  fromToken,
  fromTokenAmount: '100',
  toToken,
  minReceiveToTokenAmount: '90',
  toTokenReceiver: sender,
};

// Independent encodings keep the SDK decoder from defining its own expectations.
const poolKey = 'tuple(address,address,uint24,int24,address)';
const pathKey = 'tuple(address,uint24,int24,address,bytes)';
const v4Input = (
  newVersion: boolean,
  action: number,
  zeroForOne = true,
  prepaid = false
) => {
  const single = action === 0x06 || action === 0x08;
  const exactOut = action === 0x08 || action === 0x09;
  const input = single && !zeroForOne ? toToken : fromToken;
  const output = single && !zeroForOne ? fromToken : toToken;
  const schema = single
    ? `tuple(${poolKey},bool,uint128,uint128,${
        newVersion ? 'uint256,' : ''
      }bytes)`
    : `tuple(address,${pathKey}[],${
        newVersion ? 'uint256[],' : ''
      }uint128,uint128)`;
  const amounts = exactOut ? [90, 100] : [100, 90];
  const value = single
    ? [
        [fromToken, toToken, 3000, 60, zero],
        zeroForOne,
        ...amounts,
        ...(newVersion ? [1] : []),
        '0x',
      ]
    : [
        exactOut ? toToken : fromToken,
        [
          ['0x4444444444444444444444444444444444444444', 3000, 60, zero, '0x'],
          [exactOut ? fromToken : toToken, 3000, 60, zero, '0x'],
        ],
        ...(newVersion ? [[1, 1]] : []),
        ...amounts,
      ];
  return encode(
    ['bytes', 'bytes[]'],
    [
      `0x${action.toString(16).padStart(2, '0')}${prepaid ? '0b' : '0c'}0e`,
      [
        encode([schema], [value]),
        prepaid
          ? encode(['address', 'uint256', 'bool'], [input, 100, false])
          : encode(['address', 'uint256'], [input, 100]),
        // OPEN_DELTA avoids a later payment bound hiding a wrong swap minimum.
        encode(['address', 'address', 'uint256'], [output, sender, 0]),
      ],
    ]
  );
};

const routerVersions = [
  {
    version: '2.0',
    address: v2Router,
    chainId: 1,
    nativeTokenAddress: 'eth',
    newVersion: false,
  },
  {
    version: '2.1.1',
    address: arcRouter,
    chainId: 5042,
    nativeTokenAddress: 'arc',
    newVersion: true,
  },
];

describe.each(routerVersions)(
  'current Universal Router $version / chain $chainId',
  ({ address, chainId, nativeTokenAddress, newVersion }) => {
    it.each([
      { name: 'single exact input', action: 0x06 },
      { name: 'path exact input', action: 0x07 },
    ])('decodes V4 $name with the correct fields', ({ action }) => {
      const data = universal.encodeFunctionData('execute', [
        '0x10',
        [v4Input(newVersion, action)],
        2000000000,
      ]);
      expect(
        decodeCalldata('Uniswap', transaction(data, address, chainId), {
          nativeTokenAddress,
        })
      ).toEqual(expected);
    });

    it('reads both currencies in a zeroForOne=false single swap', () => {
      const data = universal.encodeFunctionData('execute', [
        '0x10',
        [v4Input(newVersion, 0x06, false)],
        2000000000,
      ]);
      expect(
        decodeCalldata('Uniswap', transaction(data, address, chainId), {
          nativeTokenAddress,
        })
      ).toEqual({ ...expected, fromToken: toToken, toToken: fromToken });
    });

    it.each([0x08, 0x09])('rejects V4 exact-output action %s', (action) => {
      const data = universal.encodeFunctionData('execute', [
        '0x10',
        [v4Input(newVersion, action)],
        2000000000,
      ]);
      expect(() =>
        decodeCalldata('Uniswap', transaction(data, address, chainId), {
          nativeTokenAddress,
        })
      ).toThrow('current exact-input quote flow');
    });
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
  const execute = (commands: string, inputs: string[]) =>
    universal.encodeFunctionData('execute', [commands, inputs, 2000000000]);

  it('decodes V2 exact input without reversing its path', () => {
    const input = encode(
      ['address', 'uint256', 'uint256', 'address[]', 'bool'],
      [msgSender, 100, 90, [fromToken, toToken], true]
    );
    expect(
      decodeCalldata('Uniswap', transaction(execute('0x08', [input])))
    ).toEqual(expected);
  });

  it.each([0x01, 0x09])('rejects exact-output command %s', (command) => {
    const data = execute(utils.hexlify(command), [ammInput]);
    expect(() => decodeCalldata('Uniswap', transaction(data))).toThrow(
      'current exact-input quote flow'
    );
  });

  it('uses the zkSync 1.2 mask despite the SDK 2.0 address alias', () => {
    const data = execute('0x20', [ammInput]);
    const tx = transaction(data, eraRouter, 324);
    expect(getCalldataVersion('Uniswap', tx)).toBe('Universal Router 1.2');
    expect(decodeCalldata('Uniswap', tx)).toEqual(expected);
    expect(() =>
      decodeCalldata('Uniswap', transaction(data, arcRouter, 5042), {
        nativeTokenAddress: 'arc',
      })
    ).toThrow('Unsupported command 0x20');
  });

  it('strips execution flags before delegating a command to the SDK', () => {
    expect(
      decodeCalldata('Uniswap', transaction(execute('0x80', [ammInput])))
    ).toEqual(expected);
  });

  it('does not interpret a zkSync 1.2 Seaport command as a V4 swap', () => {
    const data = execute('0x10', [v4Input(false, 0x06)]);
    expect(() =>
      decodeCalldata('Uniswap', transaction(data, eraRouter, 324))
    ).toThrow('Seaport, not a V4 swap');
  });

  it.each([
    sender,
    '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b',
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
    '0xd92a36b0000531ef3063ded4de20a0783308446c',
    '0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca',
    '0x23617e59a5925b2a4bf75d73ff6711cd0b29de85',
    '0xab863e752bf67d8dcdd929eaae9be9dc83fb3bbb',
  ])(
    'rejects a router outside the current chain configuration: %s',
    (address) => {
      expect(() =>
        decodeCalldata(
          'Uniswap',
          transaction(execute('0x00', [ammInput]), address)
        )
      ).toThrow('Unknown Universal Router version');
    }
  );

  it('selects the inner router version for SwapProxy calls', () => {
    const proxy = new utils.Interface([
      'function execute(address router,address token,uint256 amount,bytes commands,bytes[] inputs,uint256 deadline)',
    ]);
    const data = proxy.encodeFunctionData('execute', [
      arcRouter,
      fromToken,
      100,
      '0x10',
      [v4Input(true, 0x07, true, true)], // Spend proxy funds, not another user debit.
      2000000000,
    ]);
    expect(
      decodeCalldata(
        'Uniswap',
        transaction(data, '0x02E5be68D46DAc0B524905bfF209cf47EE6dB2a9', 5042),
        { nativeTokenAddress: 'arc' }
      )
    ).toEqual(expected);
  });

  it('rejects executeSigned outside the current quote flow', () => {
    const signed = new utils.Interface([
      'function executeSigned(bytes commands,bytes[] inputs,bytes32 intent,bytes32 data,bool verifySender,bytes32 nonce,bytes signature,uint256 deadline)',
    ]);
    const data = signed.encodeFunctionData('executeSigned', [
      '0x00',
      [ammInput],
      utils.hexZeroPad('0x01', 32),
      utils.hexZeroPad('0x02', 32),
      false,
      utils.hexZeroPad('0x03', 32),
      '0x' + '11'.repeat(65),
      2000000000,
    ]);
    expect(() =>
      decodeCalldata('Uniswap', transaction(data, arcRouter, 5042), {
        nativeTokenAddress: 'arc',
      })
    ).toThrow('no matching function');
  });

  it('keeps the command, action index and version in a V4 decoding failure', () => {
    const brokenV4 = encode(['bytes', 'bytes[]'], ['0x06', ['0x']]);
    const data = execute('0x10', [brokenV4]);
    try {
      decodeCalldata('Uniswap', transaction(data));
      throw new Error('Malformed V4 input unexpectedly decoded');
    } catch (error) {
      expect(error).toBeInstanceOf(CalldataDecodeError);
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
    expect(
      decodeCalldata(
        'Uniswap',
        transaction(execute('0xa1', [nested]), arcRouter, 5042),
        { nativeTokenAddress: 'arc' }
      )
    ).toEqual(expected);
  });

  it('rejects command/input length mismatches', () => {
    expect(() =>
      decodeCalldata('Uniswap', transaction(execute('0x0000', [ammInput])))
    ).toThrow('Commands and inputs lengths differ');
  });
});

describe('traditional Router entry points are outside the current quote flow', () => {
  it.each([
    {
      abi:
        'function swapExactETHForTokens(uint256,address[],address,uint256) payable',
      method: 'swapExactETHForTokens',
      args: [90, [fromToken, toToken], sender, 2000000000],
    },
    {
      abi:
        'function exactInputSingle(tuple(address,address,uint24,address,uint256,uint256,uint256,uint160))',
      method: 'exactInputSingle',
      args: [[fromToken, toToken, 3000, sender, 2000000000, 100, 90, 0]],
    },
    {
      abi:
        'function exactInputSingle(tuple(address,address,uint24,address,uint256,uint256,uint160))',
      method: 'exactInputSingle',
      args: [[fromToken, toToken, 3000, sender, 100, 90, 0]],
    },
  ])('rejects $abi', ({ abi, method, args }) => {
    const legacy = new utils.Interface([abi]);
    expect(() =>
      decodeCalldata(
        'Uniswap',
        transaction(legacy.encodeFunctionData(method, args))
      )
    ).toThrow('no matching function');
  });
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
