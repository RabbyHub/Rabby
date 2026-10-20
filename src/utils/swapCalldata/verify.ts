import BigNumber from 'bignumber.js';
import {
  CALLDATA_MIN_RECEIVE_TOLERANCE,
  VerifyCalldataParams,
} from '@rabby-wallet/rabby-swap';
import { decodeInputFee } from './magpie';
import { getComparableUniInputAmount } from './uni/assets';
import { isSameAddress } from './utils';
import type { DecodeCalldataResult, TxWithChainId } from './types';

type LocalVerifyParams = VerifyCalldataParams & {
  tx: TxWithChainId;
  nativeTokenAddress: string;
  userAddress?: string;
};

export interface CalldataResultValidation {
  passed: boolean;
  checks: Record<keyof DecodeCalldataResult, boolean>;
  expected: DecodeCalldataResult;
  comparedInputAmount: string;
  // Preserve the SDK's existing minimum-output comparison policy explicitly.
  minReceiveRelativeTolerance: number;
  error?: string;
}

// These checks compare the decoded result with the requested swap and quote.
// They do not establish that a transaction would execute successfully onchain.
export const validateCalldataResult = (
  params: LocalVerifyParams
): CalldataResultValidation | null => {
  const { decoded, data, tx, dexId, nativeTokenAddress } = params;
  if (!decoded || !data) return null;

  const minimum = new BigNumber(data.toTokenAmount).times(
    new BigNumber(1).minus(params.slippage)
  );
  const expected: DecodeCalldataResult = {
    fromToken: data.fromToken,
    fromTokenAmount: data.fromTokenAmount,
    toToken: data.toToken,
    minReceiveToTokenAmount: minimum.toFixed(),
    toTokenReceiver: params.userAddress ?? tx.from,
  };
  let comparedInputAmount = decoded.fromTokenAmount;
  let error: string | undefined;
  try {
    if (dexId === 'Magpie') {
      // DexAggregator transfers encoded fees separately, then swaps amountIn.
      // Reconstruct the total input debit; do not assume a fixed fee rate.
      // https://docs.fly.trade/developers/api-reference/evm-swap-integration-guide#step-1-get-a-quote
      comparedInputAmount = new BigNumber(decoded.fromTokenAmount)
        .plus(decodeInputFee(tx))
        .toFixed(0);
    } else if (dexId === 'Uniswap') {
      expected.fromTokenAmount = getComparableUniInputAmount(
        data.fromTokenAmount,
        decoded,
        tx.chainId,
        nativeTokenAddress
      );
    }
  } catch (cause) {
    // A malformed fee descriptor cannot justify accepting an amount mismatch.
    error = cause instanceof Error ? cause.message : String(cause);
  }
  const checks = {
    fromToken: isSameAddress(decoded.fromToken, expected.fromToken),
    fromTokenAmount: !error && comparedInputAmount === expected.fromTokenAmount,
    toToken: isSameAddress(decoded.toToken, expected.toToken),
    minReceiveToTokenAmount:
      minimum.gt(0) &&
      new BigNumber(decoded.minReceiveToTokenAmount)
        .minus(minimum)
        .div(minimum)
        .abs()
        .lte(CALLDATA_MIN_RECEIVE_TOLERANCE),
    toTokenReceiver: isSameAddress(
      decoded.toTokenReceiver,
      expected.toTokenReceiver
    ),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    expected,
    comparedInputAmount,
    minReceiveRelativeTolerance: CALLDATA_MIN_RECEIVE_TOLERANCE,
    ...(error ? { error } : {}),
  };
};

// Receiver verification is separate in the SDK's VerifySdkResult contract.
export const isCalldataMatch = (validation: CalldataResultValidation) =>
  validation.checks.fromToken &&
  validation.checks.fromTokenAmount &&
  validation.checks.toToken &&
  validation.checks.minReceiveToTokenAmount;

export const verifyCalldata = (params: LocalVerifyParams): boolean => {
  const validation = validateCalldataResult(params);
  return !!validation && isCalldataMatch(validation);
};
