import { browser } from 'webextension-polyfill-ts';
import { EventEmitter } from 'events';

const tabEvent = new EventEmitter();

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    tabEvent.emit('tabUrlChanged', tabId, changeInfo.url);
  }
});

// window close will trigger this event also
browser.tabs.onRemoved.addListener((tabId) => {
  tabEvent.emit('tabRemove', tabId);
});

const create = async (url): Promise<number | undefined> => {
  const tab = await browser.tabs.create({
    active: true,
    url,
  });

  return tab!.id;
};

const openIndex = (route = ''): Promise<number | undefined> => {
  const url = `index.html${route && `#${route}`}`;

  return create(url);
};

export default tabEvent;

export { openIndex };
