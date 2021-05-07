import { EventEmitter } from 'events';

const tabEvent = new EventEmitter();

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    tabEvent.emit('tabUrlChanged', tabId, changeInfo.url);
  }
});

// window close will trigger this event also
chrome.tabs.onRemoved.addListener((tabId) => {
  tabEvent.emit('tabRemove', tabId);
});

const create = (url): Promise<number | undefined> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(
      {
        active: true,
        url,
      },
      (tab) => resolve(tab!.id)
    );
  });
};

const openIndex = (route = ''): Promise<number | undefined> => {
  // const indexLink = chrome.runtime.getURL('index.html');
  const url = `index.html${route && `#${route}`}`;

  return create(url);
};

export default tabEvent;

export { openIndex };
