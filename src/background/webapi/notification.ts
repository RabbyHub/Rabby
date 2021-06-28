import { browser } from 'webextension-polyfill-ts';
import { createTab } from './tab';

browser.notifications.onClicked.addListener((url) => {
  if (url.startsWith('https://')) {
    createTab(url.split('_randomId_')[0]);
  }
});

const create = (url, title, message) => {
  const randomId = +new Date();
  browser.notifications.create(`${url}_randomId_=${randomId}`, {
    type: 'basic',
    title,
    iconUrl: browser.extension.getURL('./images/icon-64.png'),
    message,
  });
};

export default { create };
