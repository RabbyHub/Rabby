import { browser } from 'webextension-polyfill-ts';
import { createTab } from './tab';

browser.notifications.onClicked.addListener((url) => {
  if (url.startsWith('https://')) {
    createTab(url);
  }
});

const create = (url, title, message) => {
  browser.notifications.create(url, {
    type: 'basic',
    title,
    iconUrl: browser.extension.getURL('./images/icon-64.png'),
    message,
  });
};

export default { create };
