import { Tabs, browser, Windows } from 'webextension-polyfill-ts';
import { WalletController } from 'background/controller/wallet';

export const getCurrentTab = async (): Promise<Tabs.Tab> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });

  return tabs[0];
};

export const getCurrentConnectSite = async (wallet: WalletController) => {
  const { id } = await getCurrentTab();
  if (!id) return null;
  return wallet.getCurrentConnectedSite(id);
};

export const openInTab = async (url): Promise<number | undefined> => {
  const tab = await browser.tabs.create({
    active: true,
    url,
  });

  return tab?.id;
};

export const getCurrentWindow = async (): Promise<number | undefined> => {
  const { id } = await browser.windows.getCurrent({
    windowTypes: ['popup'],
  } as Windows.GetInfo);

  return id;
};
