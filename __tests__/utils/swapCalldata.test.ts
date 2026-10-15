import { decodeCalldata } from '@/utils/swapCalldata';
import { utils } from 'ethers';
import magpieArbitrum from '../fixtures/swap-calldata/magpie-arbitrum-backend-signature.json';
import magpieArbitrumUsdcToWeth from '../fixtures/swap-calldata/magpie-arbitrum-usdc-to-weth-backend-signature.json';
import uniArbitrumUsdt0ToUsdc from '../fixtures/swap-calldata/uni-arbitrum-usdt0-to-usdc-v4.json';

const cases = [
  {
    name: 'Magpie / Arbitrum / ETH to USDC / swapWithBackendSignature',
    dexId: magpieArbitrum.dex,
    sample: magpieArbitrum,
    expectedAmounts: {
      fromTokenAmount: '1496250000000000',
      minReceiveToTokenAmount: '3494249',
    },
  },
  {
    name: 'Magpie / Arbitrum / USDC to WETH / swapWithBackendSignature',
    dexId: magpieArbitrumUsdcToWeth.dex,
    sample: magpieArbitrumUsdcToWeth,
    expectedAmounts: {
      fromTokenAmount: '1995000',
      minReceiveToTokenAmount: '834587873749995',
    },
  },
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

  it.each(['swapWithMagpieSignature', 'swapWithUserSignature'])(
    'decodes the existing Magpie packed-data format: %s',
    (method) => {
      const router = new utils.Interface([
        `function ${method}(bytes swapData)`,
      ]);
      // The bytes argument starts at calldata byte 68. Its amount pointers
      // reference absolute calldata offsets, matching the copied SDK format.
      const packed = new Uint8Array(156);
      packed.set(utils.arrayify(fromToken), 92 - 68);
      packed.set(utils.arrayify(toToken), 112 - 68);
      packed[137 - 68] = 160;
      packed[143 - 68] = 192;
      packed.set(
        utils.arrayify(utils.hexZeroPad(utils.hexlify(90), 32)),
        160 - 68
      );
      packed.set(
        utils.arrayify(utils.hexZeroPad(utils.hexlify(100), 32)),
        192 - 68
      );
      const data = router.encodeFunctionData(method, [packed]);

      expect(decodeCalldata('Magpie', transaction(data))).toEqual(expected);
    }
  );

  it('rejects unsupported Magpie selectors without trying another layout', () => {
    expect(() => decodeCalldata('Magpie', transaction('0xdeadbeef'))).toThrow(
      'Unsupported Magpie calldata selector: 0xdeadbeef'
    );
  });
});
