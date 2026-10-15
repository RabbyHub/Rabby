import { CHAINS } from '@debank/common';
import {
  DEX_ENUM,
  isSwapCalldataReceiverAllowed,
  isSwapWrapToken,
  verifyCalldata,
  verifyRouterAndSpender,
  verifySdk,
  VerifySdkParams,
  VerifySdkResult,
} from '@rabby-wallet/rabby-swap';
import type { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import {
  CalldataDecodeError,
  decodeCalldata,
  getCalldataVersion,
  MagpieABI,
  UniABI,
} from '@/utils/swapCalldata';
import BigNumber from 'bignumber.js';
import { utils } from 'ethers';

const logPrefix = '[swap-calldata-debug]';

const describeError = (error: unknown) =>
  error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : String(error);

const printSnapshot = (
  snapshot: Record<string, unknown> & {
    dex: DEX_ENUM;
    version: string;
    chain: string;
    status?: 'passed';
  }
) => {
  const { dex, version, chain, status, ...details } = snapshot;
  console.log(
    logPrefix,
    `${dex} | ${version} | ${chain}: calldata ${
      status === 'passed' ? '✅passed' : '❌failed'
    }`,
    details
  );
};

const inspectDecodeFailure = (params: VerifySdkParams, quote: QuoteResult) => {
  let step = 'decode.chain';
  try {
    if (!Object.values(CHAINS).some((chain) => chain.id === params.chainId)) {
      return { step, reason: 'chainId not found in the SDK chain list' };
    }
    step = 'decode.transactionABI';
    const isUni = params.dexId === DEX_ENUM.UNI;
    const abi = isUni ? UniABI : MagpieABI;
    const transaction = new utils.Interface(abi).parseTransaction({
      data: quote.tx.data,
    });
    step = isUni ? 'decode.uni.commands' : 'decode.magpie.packedData';
    // Retry without the SDK's exception-swallowing wrapper to retain the stack.
    decodeCalldata(params.dexId, { ...quote.tx, chainId: params.chainId });
    return {
      step,
      functionName: transaction.name,
      reason:
        'Outer ABI decoding succeeded, but the local decoder returned null without an internal failure reason.',
    };
  } catch (error) {
    return {
      step: error instanceof CalldataDecodeError ? error.step : step,
      error: describeError(error),
    };
  }
};

const verifyWithLocalDecoder = (params: VerifySdkParams): VerifySdkResult => {
  const tx = params.data?.tx
    ? { ...params.data.tx, chainId: params.chainId }
    : undefined;
  const [routerPass, spenderPass] = verifyRouterAndSpender({
    chain: params.chain,
    dexId: params.dexId,
    router: tx?.to,
    spender: params.data?.spender,
    payTokenId: params.payTokenId,
    receiveTokenId: params.receiveTokenId,
    nativeTokenAddress: params.nativeTokenAddress,
  });
  let decoded: VerifySdkResult['decoded'] = null;
  if (tx) {
    try {
      decoded = decodeCalldata(params.dexId, tx);
    } catch {
      // Preserve SDK fallback behavior; inspectDecodeFailure logs the error.
    }
  }
  const callDataPass = verifyCalldata({
    data: params.data,
    dexId: params.dexId,
    slippage: new BigNumber(params.slippage).div(100).toFixed(),
    tx,
    decoded,
  });
  const receiverPass = isSwapCalldataReceiverAllowed(
    decoded?.toTokenReceiver,
    params.userAddress
  );
  return {
    routerPass,
    spenderPass,
    callDataPass,
    receiverPass,
    isSdkDataPass: routerPass && spenderPass && callDataPass && receiverPass,
    decoded,
  };
};

export const verifySdkWithDebug = (
  params: VerifySdkParams,
  quote: QuoteResult
): VerifySdkResult => {
  const isTargetDex =
    params.dexId === DEX_ENUM.UNI || params.dexId === DEX_ENUM.MAGPIE;
  const useLocalDecoder =
    isTargetDex &&
    !isSwapWrapToken(
      params.payTokenId,
      params.receiveTokenId,
      params.chain,
      params.nativeTokenAddress
    );
  const result = useLocalDecoder
    ? verifyWithLocalDecoder(params)
    : verifySdk(params);

  if (!useLocalDecoder) {
    return result;
  }

  const context = {
    dex: params.dexId,
    version: getCalldataVersion(params.dexId, {
      ...(params.data || quote).tx,
      chainId: params.chainId,
    }),
    chain: params.chain,
  };

  const checks = {
    routerPass: result.routerPass,
    spenderPass: result.spenderPass,
    callDataPass: result.callDataPass,
    receiverPass: result.receiverPass,
    isSdkDataPass: result.isSdkDataPass,
  };

  if (result.decoded) {
    printSnapshot({
      ...context,
      status: 'passed',
      decoded: result.decoded,
      checks,
    });
    return result;
  }

  try {
    const decodeFailure = inspectDecodeFailure(params, params.data || quote);
    printSnapshot({
      ...context,
      firstFailedStep: decodeFailure.step,
      reason: decodeFailure.reason,
      error: decodeFailure.error,
      checks,
      quote,
    });
  } catch (error) {
    printSnapshot({
      ...context,
      firstFailedStep: 'diagnostics',
      error: describeError(error),
      checks,
      quote,
    });
  }
  return result;
};
