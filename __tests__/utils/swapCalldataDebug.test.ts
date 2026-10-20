import { CHAINS_ENUM } from '@debank/common';
import { DEX_ENUM, VerifySdkParams } from '@rabby-wallet/rabby-swap';
import { CalldataDecodeError, decodeCalldata } from '@/utils/swapCalldata';
import { verifySdkWithDebug } from '@/ui/views/Swap/hooks/calldataDebug';
import sample from '../fixtures/swap-calldata/uni-arbitrum-usdt0-to-usdc-v4.json';

jest.mock('@/utils/swapCalldata', () => ({
  ...jest.requireActual('@/utils/swapCalldata'),
  decodeCalldata: jest.fn(),
}));

const localDecoder = decodeCalldata as jest.MockedFunction<
  typeof decodeCalldata
>;
// Keep recorded API metadata in the fixture, outside the normalized quote.
const { origin: _origin, ...quote } = sample.quote;
const params: VerifySdkParams = {
  chain: CHAINS_ENUM.ARBITRUM,
  chainId: sample.chainId,
  dexId: DEX_ENUM.UNI,
  slippage: '1',
  data: quote,
  payTokenId: sample.quote.fromToken,
  receiveTokenId: sample.quote.toToken,
  nativeTokenAddress: 'arb',
  userAddress: sample.quote.tx.from,
};
const decoded = {
  fromToken: sample.quote.fromToken,
  fromTokenAmount: '4759000',
  toToken: sample.quote.toToken,
  minReceiveToTokenAmount: '4739264',
  toTokenReceiver: sample.quote.tx.from,
};

beforeEach(() => {
  localDecoder.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

it('uses the editable local decoder in Uni quote diagnostics', () => {
  localDecoder.mockReturnValue(decoded);

  const result = verifySdkWithDebug(params, quote);

  expect(localDecoder).toHaveBeenCalledTimes(1);
  expect(result.decoded).toBe(decoded);
  expect(result.isSdkDataPass).toBe(true);
  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Uniswap | Universal Router 2.0 (SwapProxy) | ARBITRUM: calldata ✅passed',
    {
      decoded,
      validation: expect.objectContaining({ passed: true }),
      checks: {
        routerPass: true,
        spenderPass: true,
        callDataPass: true,
        receiverPass: true,
        isSdkDataPass: true,
      },
    }
  );
});

it('distinguishes successful decoding from a mismatched recipient', () => {
  localDecoder.mockReturnValue(decoded);

  const result = verifySdkWithDebug(
    { ...params, userAddress: '0x1111111111111111111111111111111111111111' },
    quote
  );

  expect(result.receiverPass).toBe(false);
  expect(result.isSdkDataPass).toBe(false);
  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Uniswap | Universal Router 2.0 (SwapProxy) | ARBITRUM: calldata parsed, result ❌mismatch',
    expect.objectContaining({
      decoded,
      validation: expect.objectContaining({ passed: false }),
      firstFailedStep: 'validate.toTokenReceiver',
      quote,
      checks: {
        routerPass: true,
        spenderPass: true,
        callDataPass: true,
        receiverPass: false,
        isSdkDataPass: false,
      },
    })
  );
});

it('fails validation and includes the original quote when decoding fails', () => {
  const error = new CalldataDecodeError(
    'decode.transactionABI',
    'no matching function for selector 0xdeadbeef'
  );
  localDecoder.mockImplementationOnce(() => {
    throw error;
  });
  const unsupportedQuote = {
    ...quote,
    tx: { ...quote.tx, data: '0xdeadbeef' + quote.tx.data.slice(10) },
  };

  const result = verifySdkWithDebug(
    { ...params, data: unsupportedQuote },
    unsupportedQuote
  );

  expect(localDecoder).toHaveBeenCalledTimes(1);
  expect(result.callDataPass).toBe(false);
  expect(result.receiverPass).toBe(false);
  expect(result.isSdkDataPass).toBe(false);
  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Uniswap | unknown | ARBITRUM: calldata ❌failed',
    {
      firstFailedStep: 'decode.transactionABI',
      error: { name: error.name, message: error.message, stack: error.stack },
      quote: unsupportedQuote,
      checks: {
        routerPass: true,
        spenderPass: true,
        callDataPass: false,
        receiverPass: false,
        isSdkDataPass: false,
      },
    }
  );
});

it('logs the version-specific decoding step together with the original quote', () => {
  const step = 'decode.uni.universal.2.0.commands[0].0x10.v4.actions[0].0x07';
  const error = new CalldataDecodeError(step, 'V4 swap input is malformed');
  localDecoder.mockImplementationOnce(() => {
    throw error;
  });

  verifySdkWithDebug(params, quote);

  expect(localDecoder).toHaveBeenCalledTimes(1);
  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Uniswap | Universal Router 2.0 (SwapProxy) | ARBITRUM: calldata ❌failed',
    expect.objectContaining({
      firstFailedStep: step,
      error: expect.objectContaining({
        message: 'V4 swap input is malformed',
        stack: error.stack,
      }),
      quote,
    })
  );
});
