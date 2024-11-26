import browser from 'webextension-polyfill';

class UserGuideService {
  currentTabId: number | undefined = undefined;

  constructor() {}

  init = () => {
    browser.tabs.onRemoved.addListener(this.onTabRemoved);
  };

  isStorageExisted = async () => {
    return Boolean(
      Object.keys(await browser.storage.local.get(null)).filter((key) => {
        return !['extensionId', 'openapi'].includes(key);
      }).length
    );
  };

  openUserGuide = async () => {
    const tab = await browser.tabs.create({
      active: true,
      url: './index.html#/new-user/guide',
    });
    this.currentTabId = tab.id;
  };

  activeUserGuide = async () => {
    if (this.currentTabId) {
      try {
        const tab = await browser.tabs.get(this.currentTabId);
        if (
          !tab.url ||
          tab.url.indexOf(browser.runtime.getURL('index.html#/new-user/')) === 0
        ) {
          await browser.tabs.update(this.currentTabId, {
            active: true,
          });
        } else {
          this.openUserGuide();
        }
      } catch (e) {
        console.log(e);
        this.openUserGuide();
      }
    } else {
      this.openUserGuide();
    }
  };

  onTabRemoved = (tabId: number) => {
    if (tabId === this.currentTabId) {
      this.currentTabId = undefined;
    }
  };

  destroy = () => {
    browser.tabs.onRemoved.removeListener(this.onTabRemoved);
    this.currentTabId = undefined;
  };
}

export const userGuideService = new UserGuideService();
