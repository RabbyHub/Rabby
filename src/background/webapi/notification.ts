import browser from 'webextension-polyfill';
import { createTab } from './tab';

browser.notifications.onClicked.addListener((url) => {
  if (url.startsWith('https://')) {
    createTab(url.split('_randomId_')[0]);
  }
});

const create = (
  url: string | undefined,
  title: string,
  message: string,
  priority = 0
) => {
  const randomId = +new Date();
  const notificationId = url ? `${url}_randomId_=${randomId}` : '';

  // Use native Chrome API if available to support requireInteraction
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    chrome.notifications.create(notificationId, {
      type: 'basic',
      title,
      iconUrl: chrome.runtime.getURL('./images/icon-64.png'),
      message,
      priority,
      requireInteraction: false,
    });
  } else {
    // Fallback to webextension-polyfill
    browser.notifications.create(notificationId, {
      type: 'basic',
      title,
      iconUrl: browser.runtime.getURL('./images/icon-64.png'),
      message,
      priority,
    });
  }
};

export default { create };
