import { CHAINS_ENUM } from '@debank/common';
import {
  DEX_ENUM,
  verifySdk,
  VerifySdkParams,
  VerifySdkResult,
} from '@rabby-wallet/rabby-swap';
import { CalldataDecodeError, decodeCalldata } from '@/utils/swapCalldata';
import { verifySdkWithDebug } from '@/ui/views/Swap/hooks/calldataDebug';
import sample from '../fixtures/swap-calldata/magpie-arbitrum-backend-signature.json';

jest.mock('@rabby-wallet/rabby-swap', () => ({
  ...jest.requireActual('@rabby-wallet/rabby-swap'),
  verifySdk: jest.fn(),
}));
jest.mock('@/utils/swapCalldata', () => ({
  ...jest.requireActual('@/utils/swapCalldata'),
  decodeCalldata: jest.fn(),
}));

const localDecoder = decodeCalldata as jest.MockedFunction<
  typeof decodeCalldata
>;
const sdkVerifier = verifySdk as jest.MockedFunction<typeof verifySdk>;
// Keep recorded API metadata in the fixture, outside the normalized quote.
const { origin: _origin, ...quote } = sample.quote;
const params: VerifySdkParams = {
  chain: CHAINS_ENUM.ARBITRUM,
  chainId: sample.chainId,
  dexId: DEX_ENUM.MAGPIE,
  slippage: '1',
  data: quote,
  payTokenId: sample.quote.fromToken,
  receiveTokenId: sample.quote.toToken,
  nativeTokenAddress: 'arb',
  userAddress: sample.quote.tx.from,
};
const decoded = {
  fromToken: sample.quote.fromToken,
  fromTokenAmount: sample.quote.fromTokenAmount,
  toToken: sample.quote.toToken,
  minReceiveToTokenAmount: '3494249',
  toTokenReceiver: sample.quote.tx.from,
};

beforeEach(() => {
  localDecoder.mockReset();
  sdkVerifier.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

it('uses the editable local decoder in Magpie quote diagnostics', () => {
  localDecoder.mockReturnValue(decoded);

  const result = verifySdkWithDebug(params, quote);

  expect(localDecoder).toHaveBeenCalledTimes(1);
  expect(sdkVerifier).not.toHaveBeenCalled();
  expect(result.decoded).toBe(decoded);
  expect(result.isSdkDataPass).toBe(true);
  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Magpie | DexAggregator | ARBITRUM: calldata ✅passed',
    {
      decoded,
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

it('logs successful parsing even when the receiver check fails', () => {
  localDecoder.mockReturnValue(decoded);

  const result = verifySdkWithDebug(
    { ...params, userAddress: '0x1111111111111111111111111111111111111111' },
    quote
  );

  expect(result.receiverPass).toBe(false);
  expect(result.isSdkDataPass).toBe(false);
  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Magpie | DexAggregator | ARBITRUM: calldata ✅passed',
    {
      decoded,
      checks: {
        routerPass: true,
        spenderPass: true,
        callDataPass: true,
        receiverPass: false,
        isSdkDataPass: false,
      },
    }
  );
});

it('includes the original quote when decoding fails', () => {
  localDecoder.mockReturnValue(null);
  const unsupportedQuote = {
    ...quote,
    tx: { ...quote.tx, data: '0xdeadbeef' + quote.tx.data.slice(10) },
  };

  const result = verifySdkWithDebug(
    { ...params, data: unsupportedQuote },
    unsupportedQuote
  );

  expect(result.isSdkDataPass).toBe(true);
  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Magpie | unknown | ARBITRUM: calldata ❌failed',
    {
      firstFailedStep: 'decode.transactionABI',
      reason: undefined,
      error: expect.objectContaining({
        message: expect.stringContaining('no matching function'),
      }),
      quote: unsupportedQuote,
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

it('keeps using the SDK verifier for other DEXes', () => {
  const result: VerifySdkResult = {
    routerPass: true,
    spenderPass: true,
    callDataPass: true,
    receiverPass: true,
    isSdkDataPass: true,
    decoded: null,
  };
  sdkVerifier.mockReturnValue(result);
  const otherDexParams = { ...params, dexId: DEX_ENUM.ONEINCH };

  expect(verifySdkWithDebug(otherDexParams, quote)).toBe(result);
  expect(sdkVerifier).toHaveBeenCalledWith(otherDexParams);
  expect(localDecoder).not.toHaveBeenCalled();
});

it('logs the version-specific decoding step together with the original quote', () => {
  const step = 'decode.magpie.dexAggregator.amountOutMin';
  localDecoder.mockImplementation(() => {
    throw new CalldataDecodeError(
      step,
      'amountOutMin points outside the payload'
    );
  });

  verifySdkWithDebug(params, quote);

  expect(console.log).toHaveBeenCalledWith(
    '[swap-calldata-debug]',
    'Magpie | DexAggregator | ARBITRUM: calldata ❌failed',
    expect.objectContaining({
      firstFailedStep: step,
      error: expect.objectContaining({
        message: 'amountOutMin points outside the payload',
      }),
      quote,
    })
  );
});
