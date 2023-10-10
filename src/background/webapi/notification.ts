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
  browser.notifications.create(url && `${url}_randomId_=${randomId}`, {
    type: 'basic',
    title,
    iconUrl: browser.runtime.getURL('./images/icon-64.png'),
    message,
    priority,
  });
};

export default { create };
