import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequest } from 'ahooks';
import type { UserFeedbackItem } from '@rabby-wallet/rabby-api/dist/types';
import { __DEV__ } from '@/utils/env';
import { useWallet } from '@/ui/utils';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import type { LocalUserFeedbackItem } from '@/background/service/feedback';

const LATEST_LOCAL_FEEDBACK_LIMIT = 10;
const SCREENSHOT_FEEDBACK_VIEWING_CHANGED =
  'RABBY_SCREENSHOT_FEEDBACK_VIEWING_CHANGED';

let viewingFeedback: UserFeedbackItem | null = null;

const sortFeedbackItemByCreateAtDesc = (
  a: Pick<UserFeedbackItem, 'create_at'>,
  b: Pick<UserFeedbackItem, 'create_at'>
) => b.create_at - a.create_at;

const emitViewingChanged = () => {
  window.dispatchEvent(new Event(SCREENSHOT_FEEDBACK_VIEWING_CHANGED));
};

export function useScreenshotFeedbacks() {
  const wallet = useWallet();
  const [feedbacks, setFeedbacks] = useState<LocalUserFeedbackItem[]>([]);

  const loadFeedbacks = useCallback(async () => {
    const nextFeedbacks = await wallet.getScreenshotFeedbacks();
    setFeedbacks(nextFeedbacks);
  }, [wallet]);

  const onFeedbackSubmitted = useCallback(
    async (feedback: string | Pick<UserFeedbackItem, 'id' | 'create_at'>) => {
      await wallet.onScreenshotFeedbackSubmitted(feedback);
      await loadFeedbacks();
    },
    [loadFeedbacks, wallet]
  );

  const removeLocalFeedback = useCallback(
    async (id: string) => {
      await wallet.removeScreenshotFeedback(id);
      await loadFeedbacks();
    },
    [loadFeedbacks, wallet]
  );

  const clearFeedbacks = useCallback(async () => {
    await wallet.clearScreenshotFeedbacks();
    await loadFeedbacks();
  }, [loadFeedbacks, wallet]);

  useEffect(() => {
    loadFeedbacks();

    const dispose = onBackgroundStoreChanged('feedback', ({ partials }) => {
      if (partials.screenshotFeedbacks) {
        setFeedbacks(partials.screenshotFeedbacks);
        return;
      }

      loadFeedbacks();
    });

    return dispose;
  }, [loadFeedbacks]);

  return {
    feedbacks,
    onFeedbackSubmitted,
    clearFeedbacks,
    removeLocalFeedback,
  };
}

export function useLatestRepliedFeedbacks() {
  const wallet = useWallet();
  const { feedbacks } = useScreenshotFeedbacks();
  const localFeedbacks = useMemo(
    () =>
      feedbacks
        .slice()
        .sort(sortFeedbackItemByCreateAtDesc)
        .slice(0, LATEST_LOCAL_FEEDBACK_LIMIT),
    [feedbacks]
  );
  const localFeedbackIds = useMemo(
    () => localFeedbacks.map((item) => item.id),
    [localFeedbacks]
  );

  const { data: lastRepliedFeedback, loading, error } = useRequest(
    async () => {
      if (!localFeedbackIds.length) return undefined;

      const remoteFeedbacks = (await wallet.openapi.getUserFeedbackList(
        localFeedbackIds
      )) as UserFeedbackItem[];
      const repliedFeedbacks = remoteFeedbacks
        .filter((item) => item.status === 'complete')
        .sort(sortFeedbackItemByCreateAtDesc);

      return repliedFeedbacks[0];
    },
    {
      // pollingInterval: __DEV__ ? 5 * 1000 : 30 * 1000,
      // pollingWhenHidden: true,
      refreshDeps: [localFeedbackIds.join(',')],
      staleTime: 10 * 1000,
      cacheKey: `latest-replied-feedback-${localFeedbackIds.join(',')}`,
    }
  );

  return { lastRepliedFeedback, loading, error };
}

export function useViewingFeedback() {
  const { removeLocalFeedback } = useScreenshotFeedbacks();
  const [currentViewingFeedback, setCurrentViewingFeedback] = useState(
    viewingFeedback
  );

  const startViewingFeedback = useCallback((feedback: UserFeedbackItem) => {
    viewingFeedback = feedback;
    emitViewingChanged();
  }, []);

  const finishViewFeedback = useCallback(() => {
    if (viewingFeedback?.id) {
      removeLocalFeedback(viewingFeedback.id);
    }
    viewingFeedback = null;
    emitViewingChanged();
  }, [removeLocalFeedback]);

  useEffect(() => {
    const handleChange = () => setCurrentViewingFeedback(viewingFeedback);

    window.addEventListener(SCREENSHOT_FEEDBACK_VIEWING_CHANGED, handleChange);

    return () => {
      window.removeEventListener(
        SCREENSHOT_FEEDBACK_VIEWING_CHANGED,
        handleChange
      );
    };
  }, []);

  return {
    viewingFeedback: currentViewingFeedback,
    startViewingFeedback,
    finishViewFeedback,
  };
}
