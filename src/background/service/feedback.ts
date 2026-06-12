import type { UserFeedbackItem } from '@rabby-wallet/rabby-api/dist/types';
import { createPersistStore } from 'background/utils';
import browser from 'webextension-polyfill';
import i18n, { addResourceBundle } from './i18n';
import {
  SCREENSHOT_CONTEXT_MENU_CLICKED,
  SCREENSHOT_CONTEXT_MENU_ID,
} from '@/constant/screenshot';

export type LocalUserFeedbackItem = Pick<UserFeedbackItem, 'id' | 'create_at'>;

export interface FeedbackServiceStore {
  screenshotFeedbacks: LocalUserFeedbackItem[];
}

const LATEST_LOCAL_FEEDBACK_LIMIT = 10;

const sortFeedbackItemByCreateAtDesc = (
  a: Pick<UserFeedbackItem, 'create_at'>,
  b: Pick<UserFeedbackItem, 'create_at'>
) => b.create_at - a.create_at;

const getScreenshotContextMenuTitle = () =>
  i18n.t('background.feedback.screenshotContextMenuTitle');

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

    await this.initScreenshotContextMenu();
  };

  private initScreenshotContextMenu = async () => {
    if (!browser.contextMenus) return;

    i18n.off('languageChanged', this.handleLanguageChanged);
    i18n.on('languageChanged', this.handleLanguageChanged);

    const onClicked = (info: browser.Menus.OnClickData) => {
      if (info.menuItemId !== SCREENSHOT_CONTEXT_MENU_ID) return;

      browser.runtime
        .sendMessage({
          pageUrl: info.pageUrl,
          type: SCREENSHOT_CONTEXT_MENU_CLICKED,
        })
        .catch(() => {
          // The popup may close when the browser-native context menu is used.
        });
    };

    browser.contextMenus.onClicked.removeListener(onClicked);
    browser.contextMenus.onClicked.addListener(onClicked);

    try {
      await browser.contextMenus.remove(SCREENSHOT_CONTEXT_MENU_ID);
    } catch (error) {
      // The menu may not exist yet.
    }

    await browser.contextMenus.create({
      id: SCREENSHOT_CONTEXT_MENU_ID,
      title: getScreenshotContextMenuTitle(),
      contexts: ['all'],
      documentUrlPatterns: [
        `${browser.runtime.getURL('popup.html')}*`,
        `${browser.runtime.getURL('notification.html')}*`,
        `${browser.runtime.getURL('index.html')}*`,
        `${browser.runtime.getURL('desktop.html')}*`,
      ],
    });
  };

  private handleLanguageChanged = async (lng: string) => {
    await addResourceBundle(lng);
    await this.updateScreenshotContextMenuTitle();
  };

  private updateScreenshotContextMenuTitle = async () => {
    if (!browser.contextMenus) return;

    try {
      await browser.contextMenus.update(SCREENSHOT_CONTEXT_MENU_ID, {
        title: getScreenshotContextMenuTitle(),
      });
    } catch (error) {
      // The menu may not exist yet.
    }
  };

  setScreenshotContextMenuVisible = async (visible: boolean) => {
    if (!browser.contextMenus) return;

    await browser.contextMenus.update(SCREENSHOT_CONTEXT_MENU_ID, {
      visible,
    });
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
