import browser, { Tabs } from 'webextension-polyfill';
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

const createTab = async (url): Promise<number | undefined> => {
  const tab = await browser.tabs.create({
    active: true,
    url,
  });

  return tab?.id;
};

const openIndexPage = (route = ''): Promise<number | undefined> => {
  const url = `index.html${route && `#${route}`}`;

  return createTab(url);
};

let globalDesktopTabId: number | undefined = undefined;

export const openInDesktop = async (_url: string) => {
  const currentDesktopTab = globalDesktopTabId
    ? await browser.tabs.get(globalDesktopTabId)
    : null;

  const url = `index.html#/${_url.replace(/^\//, '')}`;
  if (currentDesktopTab) {
    return await browser.tabs.update(currentDesktopTab.id, {
      active: true,
      url: url,
    });
  }
  const tab = await browser.tabs.create({
    active: true,
    url: url,
  });
  globalDesktopTabId = tab.id;
  return tab;
};

export default tabEvent;

export { createTab, openIndexPage };
