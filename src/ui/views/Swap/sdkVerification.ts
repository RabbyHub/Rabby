import type { VerifySdkResult } from '@rabby-wallet/rabby-swap';

export const sdkCheckKeys = [
  'routerPass',
  'spenderPass',
  'callDataPass',
  'receiverPass',
] as const;
export type SwapFailedCheck = typeof sdkCheckKeys[number];
export type SwapFailureCategory =
  | 'router'
  | 'spender'
  | 'decode'
  | 'calldata'
  | 'receiver'
  | 'verification';
export type SwapVerificationFailure = {
  category: SwapFailureCategory;
  reason: string;
};
export type SwapVerificationResult = Pick<
  VerifySdkResult,
  | SwapFailedCheck
  | 'isSdkDataPass'
  | 'decodeFailure'
  | 'calldataMismatch'
  | 'decoded'
>;

// Ordered like production reporting. Retain other failures for local analysis.
export const getSwapVerificationFailures = (
  result: SwapVerificationResult
): SwapVerificationFailure[] => {
  const failures: SwapVerificationFailure[] = [];
  if (!result.routerPass)
    failures.push({ category: 'router', reason: 'router_not_allowed' });
  if (!result.spenderPass)
    failures.push({ category: 'spender', reason: 'spender_not_allowed' });
  if (result.decodeFailure || (!result.decoded && !result.callDataPass)) {
    failures.push({
      category: 'decode',
      reason:
        result.decodeFailure?.detail ||
        result.decodeFailure?.reason ||
        'missing_decoded_result',
    });
  } else if (!result.callDataPass) {
    const reasons = result.calldataMismatch?.length
      ? [...new Set(result.calldataMismatch)]
      : ['unspecified_mismatch'];
    reasons.forEach((reason) =>
      failures.push({ category: 'calldata', reason })
    );
  }
  if (!result.receiverPass)
    failures.push({ category: 'receiver', reason: 'receiver_not_allowed' });
  if (!failures.length && !result.isSdkDataPass)
    failures.push({ category: 'verification', reason: 'aggregate_failed' });
  return failures;
};
