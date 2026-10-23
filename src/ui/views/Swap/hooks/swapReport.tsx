import stats from '@/stats';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useEffect } from 'react';
import * as Sentry from '@sentry/browser';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import type {
  VerifySdkParams,
  VerifySdkResult,
} from '@rabby-wallet/rabby-swap';

const CALLDATA_DECODE_REPORT_DEXES = new Set<DEX_ENUM>([
  DEX_ENUM.UNI,
  DEX_ENUM.MAGPIE,
  DEX_ENUM.PANCAKESWAP,
]);

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
  result: Pick<
    VerifySdkResult,
    | 'routerPass'
    | 'spenderPass'
    | 'callDataPass'
    | 'receiverPass'
    | 'decodeFailure'
  >;
};

export const reportSwapSdkVerification = ({
  chain,
  dexId,
  payTokenId,
  receiveTokenId,
  result,
}: SwapSdkVerificationReportParams) => {
  const { decodeFailure } = result;
  let category: string;

  if (!result.routerPass) {
    category = 'router';
  } else if (!result.spenderPass) {
    category = 'spender';
  } else if (decodeFailure) {
    // Only report decoders covered by the current validation round. Return here
    // so an ignored decode failure cannot fall through to a calldata report.
    if (!CALLDATA_DECODE_REPORT_DEXES.has(dexId)) return;
    category = 'decode';
  } else if (!result.callDataPass) {
    category = 'calldata';
  } else if (!result.receiverPass) {
    category = 'receiver';
  } else {
    return;
  }

  Sentry.captureException(new Error('swap SDK verification failed'), {
    level: 'warning',
    tags: {
      swap_dex: dexId,
      swap_chain: chain,
      swap_verify_category: category,
      swap_token_pair: `${payTokenId}/${receiveTokenId}`,
      swap_decode_reason: decodeFailure?.reason,
      swap_decode_selector: decodeFailure?.selector,
      swap_decode_error_code: decodeFailure?.errorCode,
    },
    fingerprint: ['swap-verify-sdk'],
  });
};
