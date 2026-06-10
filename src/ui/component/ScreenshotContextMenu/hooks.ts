import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequest } from 'ahooks';
import type { UserFeedbackItem } from '@rabby-wallet/rabby-api/dist/types';
import { __DEV__ } from '@/utils/env';
import { useWallet } from '@/ui/utils';

type LocalUserFeedbackItem = Pick<UserFeedbackItem, 'id' | 'create_at'>;

const LATEST_LOCAL_FEEDBACK_LIMIT = 10;
const SCREENSHOT_FEEDBACK_STORAGE_KEY = 'rabby:screenshot-feedbacks';
const SCREENSHOT_FEEDBACK_STORE_CHANGED =
  'RABBY_SCREENSHOT_FEEDBACK_STORE_CHANGED';
const SCREENSHOT_FEEDBACK_VIEWING_CHANGED =
  'RABBY_SCREENSHOT_FEEDBACK_VIEWING_CHANGED';

let viewingFeedback: UserFeedbackItem | null = null;

const sortFeedbackItemByCreateAtDesc = (
  a: Pick<UserFeedbackItem, 'create_at'>,
  b: Pick<UserFeedbackItem, 'create_at'>
) => b.create_at - a.create_at;

const emitStoreChanged = () => {
  window.dispatchEvent(new Event(SCREENSHOT_FEEDBACK_STORE_CHANGED));
};

const emitViewingChanged = () => {
  window.dispatchEvent(new Event(SCREENSHOT_FEEDBACK_VIEWING_CHANGED));
};

const normalizeFeedbacks = (feedbacks: LocalUserFeedbackItem[]) => {
  const uniqueFeedbacks = new Map<string, LocalUserFeedbackItem>();

  feedbacks.forEach((item) => {
    if (!item?.id) return;
    uniqueFeedbacks.set(item.id, item);
  });

  return Array.from(uniqueFeedbacks.values())
    .sort(sortFeedbackItemByCreateAtDesc)
    .slice(0, LATEST_LOCAL_FEEDBACK_LIMIT);
};

const getLocalFeedbacks = (): LocalUserFeedbackItem[] => {
  try {
    const raw = localStorage.getItem(SCREENSHOT_FEEDBACK_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return normalizeFeedbacks(parsed);
  } catch (error) {
    console.error('Failed to read screenshot feedbacks', error);
    return [];
  }
};

const setLocalFeedbacks = (feedbacks: LocalUserFeedbackItem[]) => {
  localStorage.setItem(
    SCREENSHOT_FEEDBACK_STORAGE_KEY,
    JSON.stringify(normalizeFeedbacks(feedbacks))
  );
  emitStoreChanged();
};

const onFeedbackSubmitted = (
  feedback: string | Pick<UserFeedbackItem, 'id' | 'create_at'>
) => {
  const item =
    typeof feedback === 'string'
      ? {
          id: feedback,
          create_at: Date.now(),
        }
      : feedback;

  if (!item?.id) return;

  setLocalFeedbacks([item, ...getLocalFeedbacks()]);
};

const removeLocalFeedback = (id: string) => {
  setLocalFeedbacks(getLocalFeedbacks().filter((item) => item.id !== id));
};

const clearFeedbacks = () => {
  setLocalFeedbacks([]);
};

export function useScreenshotFeedbacks() {
  const [feedbacks, setFeedbacks] = useState(getLocalFeedbacks);

  useEffect(() => {
    const handleChange = () => setFeedbacks(getLocalFeedbacks());

    window.addEventListener(SCREENSHOT_FEEDBACK_STORE_CHANGED, handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener(
        SCREENSHOT_FEEDBACK_STORE_CHANGED,
        handleChange
      );
      window.removeEventListener('storage', handleChange);
    };
  }, []);

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

      const remoteFeedbacks = await wallet.openapi.getUserFeedbackList(
        localFeedbackIds
      );
      const repliedFeedbacks = remoteFeedbacks
        .filter((item) => item.status === 'complete')
        .sort(sortFeedbackItemByCreateAtDesc);

      return repliedFeedbacks[0];
    },
    {
      pollingInterval: __DEV__ ? 5 * 1000 : 30 * 1000,
      pollingWhenHidden: true,
      refreshDeps: [localFeedbackIds.join(',')],
    }
  );

  return { lastRepliedFeedback, loading, error };
}

export function useViewingFeedback() {
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
  }, []);

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
