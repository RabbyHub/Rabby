import stats from '@/stats';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useEffect } from 'react';
import * as Sentry from '@sentry/browser';
import type { VerifySdkParams } from '@rabby-wallet/rabby-swap';
import { verifySdk } from '@rabby-wallet/rabby-swap';
import { getSwapVerificationFailures, sdkCheckKeys } from '../sdkVerification';
import type { SwapVerificationResult } from '../sdkVerification';

export const useSwapStatsReport = () => {
  const rbiSource = useRbiSource();

  useEffect(() => {
    if (rbiSource) {
      stats.report('enterSwapDescPage', {
        refer: rbiSource,
      });
    }
  }, [rbiSource]);
};

type SwapSdkVerificationReportParams = Pick<
  VerifySdkParams,
  'chain' | 'dexId' | 'payTokenId' | 'receiveTokenId'
> & {
  result: SwapVerificationResult | null;
  selector?: string;
};

export const reportSwapSdkVerification = ({
  chain,
  dexId,
  payTokenId,
  receiveTokenId,
  result,
  selector,
}: SwapSdkVerificationReportParams) => {
  try {
    reportSwapSdkVerificationUnsafe({
      chain,
      dexId,
      payTokenId,
      receiveTokenId,
      result,
      selector,
    });
  } catch (error) {
    // Reporting must not discard a quote the swap flow already received.
    console.error('swap SDK verification report failed', error);
  }
};

const reportSwapSdkVerificationUnsafe = ({
  chain,
  dexId,
  payTokenId,
  receiveTokenId,
  result,
  selector,
}: SwapSdkVerificationReportParams) => {
  const decodeFailure = result?.decodeFailure;
  const failures = result
    ? getSwapVerificationFailures(result)
    : [{ category: 'verification', reason: 'sdk_exception' }];
  if (!failures.length) return;
  const { category } = failures[0];
  const primaryReasons = failures
    .filter((failure) => failure.category === category)
    .map((failure) => failure.reason)
    .sort()
    .join(',');

  const calldataReasons = Array.isArray(result?.calldataMismatch)
    ? result.calldataMismatch.join(',')
    : undefined;
  const tags: Record<string, string> = {
    swap_dex: dexId,
    swap_chain: chain,
    swap_verify_category: category,
    swap_verify_reasons: primaryReasons,
    swap_token_pair: `${payTokenId}/${receiveTokenId}`,
  };
  if (result)
    tags.swap_failed_checks = sdkCheckKeys
      .filter((key) => !result[key])
      .join(',');
  if (selector && /^0x[0-9a-f]{8}$/i.test(selector))
    tags.swap_tx_selector = selector.toLowerCase();
  if (decodeFailure?.reason) tags.swap_decode_reason = decodeFailure.reason;
  if (decodeFailure?.detail) tags.swap_decode_detail = decodeFailure.detail;
  if (decodeFailure?.selector)
    tags.swap_decode_selector = decodeFailure.selector;
  if (decodeFailure?.errorCode) {
    tags.swap_decode_error_code = decodeFailure.errorCode;
  }
  if (calldataReasons) tags.swap_calldata_reasons = calldataReasons;

  Sentry.captureException(new Error('swap SDK verification failed'), {
    level: 'warning',
    tags,
    fingerprint: ['swap-verify-sdk', category, primaryReasons],
  });
};

export const verifyAndReportSwapSdk = (params: VerifySdkParams) => {
  const data = params.data?.tx?.data;
  const selector = typeof data === 'string' ? data.slice(0, 10) : undefined;
  let result;
  try {
    result = verifySdk(params);
  } catch (error) {
    // Report a stable code; raw SDK errors may contain transaction data.
    // The SDK exception still propagates. A report failure must not replace it.
    reportSwapSdkVerification({ ...params, result: null, selector });
    throw error;
  }
  reportSwapSdkVerification({ ...params, result, selector });
  return result;
};
