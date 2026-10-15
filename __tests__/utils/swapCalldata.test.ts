import { decodeCalldata } from '@/utils/swapCalldata';
import { utils } from 'ethers';
import magpieArbitrum from '../fixtures/swap-calldata/magpie-arbitrum-backend-signature.json';

const cases = [
  {
    name: 'Magpie / Arbitrum / ETH to USDC / swapWithBackendSignature',
    dexId: magpieArbitrum.dex,
    sample: magpieArbitrum,
  },
];

describe('recorded swap calldata decoding', () => {
  it.each(cases)('$name', ({ dexId, sample }) => {
    // Exercise the local decoder, without verifySdk's skipped-check fallback
    // or a receiver comparison against the currently selected account.
    const decoded = decodeCalldata(dexId, {
      ...sample.quote.tx,
      chainId: sample.chainId,
    });

    console.log('[swap-calldata-test]', dexId, decoded);

    expect(decoded).not.toBeNull();
    expect(decoded).toMatchObject({
      fromToken: sample.quote.fromToken,
      toToken: sample.quote.toToken,
      fromTokenAmount: expect.stringMatching(/^[1-9]\d*$/),
      minReceiveToTokenAmount: expect.stringMatching(/^[1-9]\d*$/),
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

    expect(decodeCalldata('Uniswap', transaction(data))).toEqual(expected);
  });

  it('decodes the existing Magpie packed-data format', () => {
    const router = new utils.Interface([
      'function swapWithMagpieSignature(bytes swapData)',
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
    const data = router.encodeFunctionData('swapWithMagpieSignature', [packed]);

    expect(decodeCalldata('Magpie', transaction(data))).toEqual(expected);
  });
});
