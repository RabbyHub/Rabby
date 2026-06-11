import type { UserFeedbackItem } from '@rabby-wallet/rabby-api/dist/types';
import { createPersistStore } from 'background/utils';

export type LocalUserFeedbackItem = Pick<UserFeedbackItem, 'id' | 'create_at'>;

export interface FeedbackServiceStore {
  screenshotFeedbacks: LocalUserFeedbackItem[];
}

const LATEST_LOCAL_FEEDBACK_LIMIT = 10;

const sortFeedbackItemByCreateAtDesc = (
  a: Pick<UserFeedbackItem, 'create_at'>,
  b: Pick<UserFeedbackItem, 'create_at'>
) => b.create_at - a.create_at;

class FeedbackService {
  store: FeedbackServiceStore = {
    screenshotFeedbacks: [],
  };

  init = async () => {
    const storage = await createPersistStore<FeedbackServiceStore>({
      name: 'feedback',
      template: {
        screenshotFeedbacks: [],
      },
    });

    this.store = storage || this.store;
    this.store.screenshotFeedbacks = this.normalizeFeedbacks(
      this.store.screenshotFeedbacks
    );
  };

  private normalizeFeedbacks = (feedbacks: LocalUserFeedbackItem[]) => {
    const uniqueFeedbacks = new Map<string, LocalUserFeedbackItem>();

    feedbacks.forEach((item) => {
      if (!item?.id) return;
      uniqueFeedbacks.set(item.id, item);
    });

    return Array.from(uniqueFeedbacks.values())
      .sort(sortFeedbackItemByCreateAtDesc)
      .slice(0, LATEST_LOCAL_FEEDBACK_LIMIT);
  };

  getScreenshotFeedbacks = () => {
    return this.normalizeFeedbacks(this.store.screenshotFeedbacks);
  };

  onScreenshotFeedbackSubmitted = (
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

    this.store.screenshotFeedbacks = this.normalizeFeedbacks([
      item,
      ...this.store.screenshotFeedbacks,
    ]);
  };

  removeScreenshotFeedback = (id: string) => {
    this.store.screenshotFeedbacks = this.normalizeFeedbacks(
      this.store.screenshotFeedbacks.filter((item) => item.id !== id)
    );
  };

  clearScreenshotFeedbacks = () => {
    this.store.screenshotFeedbacks = [];
  };
}

export default new FeedbackService();
