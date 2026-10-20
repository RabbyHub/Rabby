import {
  verifyRouterAndSpender,
  VerifySdkParams,
  VerifySdkResult,
} from '@rabby-wallet/rabby-swap';
import type { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import {
  CalldataDecodeError,
  decodeCalldata,
  getCalldataVersion,
} from '@/utils/swapCalldata';
import BigNumber from 'bignumber.js';
import {
  isCalldataMatch,
  validateCalldataResult,
} from '@/utils/swapCalldata/verify';
import {
  CalldataTestRecord,
  describeCalldataTestError,
  recordCalldataTestResult,
} from '@/utils/swapCalldata/testResults';

const logPrefix = '[swap-calldata-debug]';

type LocalVerifySdkParams = VerifySdkParams & { testUsd?: number };

const printSnapshot = (
  snapshot: Pick<
    CalldataTestRecord,
    | 'dex'
    | 'version'
    | 'chain'
    | 'decoded'
    | 'checks'
    | 'firstFailedStep'
    | 'error'
    | 'reason'
    | 'quote'
    | 'validation'
  > & {
    status?: 'passed' | 'mismatch';
  },
  params: LocalVerifySdkParams,
  quote: QuoteResult
) => {
  const { dex, version, chain, status, ...details } = snapshot;
  console.log(
    logPrefix,
    `${dex} | ${version} | ${chain}: calldata ${
      status === 'passed'
        ? '✅passed'
        : status === 'mismatch'
        ? 'parsed, result ❌mismatch'
        : '❌failed'
    }`,
    details
  );
  recordCalldataTestResult({
    ...snapshot,
    chainId: params.chainId,
    status: status || 'failed',
    quote,
    request: {
      ...(params.testUsd !== undefined ? { targetUsd: params.testUsd } : {}),
      fromToken: params.payTokenId,
      fromTokenAmount: params.data?.fromTokenAmount || quote.fromTokenAmount,
      toToken: params.receiveTokenId,
      userAddress: params.userAddress,
      slippage: String(params.slippage),
      nativeTokenAddress: params.nativeTokenAddress,
    },
  });
};

// getDexQuote filters unsupported DEXes, chains and wrap pairs before this call.
export const verifySdkWithDebug = (
  params: LocalVerifySdkParams,
  quote: QuoteResult
): VerifySdkResult => {
  const tx = { ...(params.data || quote).tx, chainId: params.chainId };
  const [routerPass, spenderPass] = verifyRouterAndSpender({
    chain: params.chain,
    dexId: params.dexId,
    router: tx.to,
    spender: params.data?.spender,
    payTokenId: params.payTokenId,
    receiveTokenId: params.receiveTokenId,
    nativeTokenAddress: params.nativeTokenAddress,
  });
  let decoded: VerifySdkResult['decoded'] = null;
  let decodeFailure:
    | Pick<CalldataTestRecord, 'firstFailedStep' | 'error'>
    | undefined;
  try {
    decoded = decodeCalldata(params.dexId, tx, {
      nativeTokenAddress: params.nativeTokenAddress,
    });
  } catch (error) {
    decodeFailure = {
      firstFailedStep:
        error instanceof CalldataDecodeError ? error.step : 'decode',
      error: describeCalldataTestError(error),
    };
  }
  const validation = validateCalldataResult({
    data: params.data,
    dexId: params.dexId,
    slippage: new BigNumber(params.slippage).div(100).toFixed(),
    tx,
    decoded,
    nativeTokenAddress: params.nativeTokenAddress,
    userAddress: params.userAddress,
  });
  // A failed decode cannot establish calldata or recipient correctness.
  const callDataPass = !!validation && isCalldataMatch(validation);
  const receiverPass = validation?.checks.toTokenReceiver ?? false;
  const checks = {
    routerPass,
    spenderPass,
    callDataPass,
    receiverPass,
    isSdkDataPass: routerPass && spenderPass && callDataPass && receiverPass,
  };

  const context = {
    dex: params.dexId,
    version: getCalldataVersion(params.dexId, tx),
    chain: params.chain,
  };

  if (decoded) {
    printSnapshot(
      {
        ...context,
        status: validation?.passed ? 'passed' : 'mismatch',
        decoded,
        checks,
        ...(validation ? { validation } : {}),
        ...(!validation?.passed
          ? {
              firstFailedStep: `validate.${
                validation
                  ? Object.entries(validation.checks).find(
                      ([, pass]) => !pass
                    )?.[0]
                  : 'quote'
              }`,
              reason:
                validation?.error ||
                'Decoded calldata result does not match the requested swap and quote.',
              quote,
            }
          : {}),
      },
      params,
      quote
    );
  } else {
    printSnapshot(
      {
        ...context,
        ...decodeFailure,
        checks,
        quote,
      },
      params,
      quote
    );
  }
  return { ...checks, decoded };
};
