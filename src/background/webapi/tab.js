import { EventEmitter } from 'events';

const tabEvent = new EventEmitter();

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    tabEvent.emit('tabUrlChanged', tabId, changeInfo.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabEvent.emit('tabRemove', tabId);
});

export default tabEvent;
