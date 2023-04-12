import { getOriginFromUrl } from '@/utils';
import { CHAINS_ENUM } from '@debank/common';
import {
  permissionService,
  preferenceService,
  sessionService,
} from 'background/service';

const getTabsOriginList = () => {
  return new Promise<string[]>((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      const originList = tabs.map((tab) => {
        return getOriginFromUrl(tab.url || '');
      });
      resolve(originList);
    });
  });
};

const getContextMenuTitle = (origin: string) => {
  const site = permissionService.getSite(origin);
  const title = site?.preferMetamask
    ? 'Stop always using MetaMask on this dapp'
    : 'Always use MetaMask on this dapp';
  return title;
};

export class ContextMenu {
  store = new Set<string>();

  constructor() {
    chrome.contextMenus.onClicked.addListener(this.listener);
  }

  create(origin: string) {
    if (this.store.has(origin) || !preferenceService.getHasOtherProvider()) {
      return;
    }

    chrome.contextMenus.create(
      {
        id: origin,
        title: getContextMenuTitle(origin),
        documentUrlPatterns: [`${origin}/*`],
      },
      () => {
        this.store.add(origin);
      }
    );
  }
  update(origin: string) {
    if (!this.store.has(origin)) {
      this.create(origin);
      return;
    }

    chrome.contextMenus.update(origin, {
      title: getContextMenuTitle(origin),
    });
  }
  remove(origin: string) {
    if (!this.store.has(origin)) {
      return;
    }
    chrome.contextMenus.remove(origin, () => {
      this.store.delete(origin);
    });
  }
  removeAll() {
    this.store.clear();
    chrome.contextMenus.removeAll();
  }

  async sync() {
    const originList = await getTabsOriginList();
    this.store.forEach((origin) => {
      if (!originList.includes(origin)) {
        this.remove(origin);
      }
    });
    originList.forEach((origin) => {
      if (!this.store.has(origin)) {
        this.create(origin);
      }
    });
  }

  async init() {
    this.removeAll();
    const originList = await getTabsOriginList();
    originList.forEach((origin) => {
      this.create(origin);
    });
  }

  private listener = (
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) => {
    if (!info.menuItemId) {
      return;
    }

    let site = permissionService.getSite(info.menuItemId);
    if (!site && tab) {
      site = {
        origin: info.menuItemId,
        icon: tab.favIconUrl || '',
        name: tab.title || '',
        isSigned: false,
        isConnected: false,
        isTop: false,
        chain: CHAINS_ENUM.ETH,
      };
    }
    if (!site) {
      return;
    }
    const prevIsDefaultWallet = preferenceService.getIsDefaultWallet(
      site.origin
    );
    site.preferMetamask = !site.preferMetamask;
    permissionService.setSite(site);
    this.update(info.menuItemId);
    const currentIsDefaultWallet = preferenceService.getIsDefaultWallet(
      site.origin
    );
    if (
      prevIsDefaultWallet !== currentIsDefaultWallet &&
      preferenceService.getHasOtherProvider()
    ) {
      sessionService.broadcastEvent(
        'defaultWalletChanged',
        currentIsDefaultWallet ? 'rabby' : 'metamask',
        site.origin
      );
    }
  };
}

export const contextMenuService = new ContextMenu();
