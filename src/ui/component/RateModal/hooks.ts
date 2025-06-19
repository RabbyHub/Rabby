import { useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/browser';

import { getDefaultRateModalState } from '@/ui/models/rateGuidance';
import { useRabbyDispatch, useRabbyGetter, useRabbySelector } from '@/ui/store';
import { coerceInteger, useWallet } from '@/ui/utils';
import {
  getDefaultRateGuideLastExposure,
  userCouldRated,
} from '@/utils-isomorphic/rateGuidance';
import { __DEV__, appIsDev } from '@/utils/env';
import { ensurePrefix } from '@/utils/string';

const TX_COUNT_LIMIT = appIsDev ? 1 : 3; // Minimum number of transactions before showing the rate guide
const STAR_COUNT = 5;

export function useMakeMockDataForRateGuideExposure() {
  const rDispatch = useRabbyDispatch();

  const mockExposureRateGuide = useCallback(() => {
    rDispatch.preference.setRateGuideLastExposure({
      ...getDefaultRateGuideLastExposure({
        time: Date.now() - 1000 * 60 * 60 * 24,
        userViewedRate: false,
      }),
      txCount: TX_COUNT_LIMIT,
      latestTxHashes: Array.from({ length: TX_COUNT_LIMIT }).map(
        (_, index) => `0x${index + 1}`
      ),
    });
  }, [rDispatch.preference]);

  return {
    mockExposureRateGuide,
  };
}

export function useExposureRateGuide() {
  const txCount = useRabbySelector(
    (s) => s.preference.rateGuideLastExposure?.txCount || 0
  );
  const userViewedRate = useRabbyGetter((s) => s.preference.userViewedRate);
  const lastExposureTimestamp = useRabbyGetter(
    (s) => s.preference.rateGuideLastExposureTimestamp
  );
  const rDispatch = useRabbyDispatch();

  // if (__DEV__) {
  //   console.debug('[useExposureRateGuide] txCount: %s', txCount);
  // }

  const shouldShowRateGuideOnHome = useMemo(() => {
    return txCount >= TX_COUNT_LIMIT && userViewedRate;
  }, [txCount, lastExposureTimestamp]);

  const disableExposureRateGuide = useCallback(() => {
    rDispatch.preference.setRateGuideLastExposure({
      ...getDefaultRateGuideLastExposure({
        userViewedRate: true,
      }),
    });
    rDispatch.rateGuidance.setField({
      ...getDefaultRateModalState(),
      visible: false,
    });
  }, [rDispatch.preference, rDispatch.rateGuidance]);

  return {
    shouldShowRateGuideOnHome,
    // shouldShowRateGuideOnHome: __DEV__ ? true : shouldShowRateGuideOnHome,

    disableExposureRateGuide,
  };
}

function coerceStar(value: number): number {
  return coerceInteger(Math.max(0, Math.min(STAR_COUNT, value)));
}

function makeStarText(count: number, total = 5) {
  return Array.from({ length: total })
    .map((_, index) => (index < count ? '★' : '☆'))
    .join('');
}

export const FEEDBACK_LEN_LIMIT = 300;

export function useRateModal() {
  const rateModalState = useRabbySelector((s) => s.rateGuidance);
  const rDispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { disableExposureRateGuide } = useExposureRateGuide();

  const toggleShowRateModal = useCallback(
    (
      nextValue: boolean = !rateModalState.visible,
      options?: {
        starCountOnOpen?: number;
        disableExposureOnClose?: boolean;
      }
    ) => {
      const nextState = {
        ...getDefaultRateModalState(),
        visible: nextValue,
      };

      if (!nextValue && options?.disableExposureOnClose) {
        disableExposureRateGuide();
      } else if (
        nextValue &&
        options?.starCountOnOpen &&
        coerceStar(options?.starCountOnOpen)
      ) {
        nextState.userStar = coerceStar(options?.starCountOnOpen);
      }
      rDispatch.rateGuidance.setField(nextState);
    },
    [rDispatch.rateGuidance, rateModalState.visible, disableExposureRateGuide]
  );

  const selectStar = useCallback(
    (star: number) => {
      rDispatch.rateGuidance.setField({
        ...rateModalState,
        userStar: coerceStar(star),
      });
    },
    [rateModalState, rDispatch.rateGuidance]
  );

  const onChangeFeedback = useCallback(
    (feedback: string) => {
      rDispatch.rateGuidance.setField({
        ...rateModalState,
        userFeedback: feedback.slice(0, FEEDBACK_LEN_LIMIT), // Limit feedback to 300 characters
      });
    },
    [rDispatch.rateGuidance, rateModalState]
  );

  const submitFeedback = useCallback(
    async (params: { totalBalanceText: string }) => {
      if (rateModalState.userStar > 3) return;

      const feedbackText = rateModalState.userFeedback.trim();

      const feedbackContent = [
        `Comment: ${feedbackText}`,
        '  ',
        `Rate: ${makeStarText(rateModalState.userStar, 5)} (${
          rateModalState.userStar
        }) `,
        `Total Balance: ${ensurePrefix(params.totalBalanceText, '$')}`,
        `Client Version: ${process.env.release || '0'}`,
      ]
        .filter(Boolean)
        .join('\n');
      /**
       * @notice In fact, it's not a real uninstall feedback, but a feedback for rate guide,
       * related request url is /v1/feedback. Just use it to submit the feedback.
       *
       **/

      try {
        await wallet.openapi.submitFeedback({
          text: feedbackContent,
          usage: 'rating',
        });
      } catch (error) {
        Sentry.captureException(error, {
          extra: {
            rateModalState,
            feedbackContent,
          },
        });
        console.error('Failed to submit feedback:', error);
      }
    },
    [rateModalState]
  );

  return {
    rateModalShown: rateModalState.visible,

    userStar: rateModalState.userStar,
    toggleShowRateModal,
    selectStar,

    userFeedback: rateModalState.userFeedback,
    feedbackOverLimit:
      rateModalState.userFeedback.length > FEEDBACK_LEN_LIMIT - 1,
    onChangeFeedback,
    submitFeedback,
  };
}
