import browser, { Tabs, Windows } from 'webextension-polyfill';
import { WalletController, WalletControllerType } from './index';
import { getOriginFromUrl } from '@/utils';

export const getCurrentTab = async (): Promise<Tabs.Tab> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });

  return tabs[0];
};

export const getCurrentConnectSite = async (
  wallet: WalletController | WalletControllerType
) => {
  const { id, url } = await getCurrentTab();
  if (!id || !url) return null;

  return (wallet as WalletControllerType).getCurrentConnectedSite(
    id,
    getOriginFromUrl(url)
  );
};

export const openInTab = async (
  url?: string,
  needClose = true
): Promise<Tabs.Tab> => {
  const tab = await browser.tabs.create({
    active: true,
    url,
  });

  if (needClose) window.close();

  return tab;
};

export const getCurrentWindow = async (): Promise<number | undefined> => {
  const { id } = await browser.windows.getCurrent({
    windowTypes: ['popup'],
  } as Windows.GetInfo);

  return id;
};

export const openInternalPageInTab = (path: string, useWebapi = true) => {
  if (useWebapi) {
    openInTab(`./index.html#/${path}`);
  } else {
    window.open(`./index.html#/${path}`);
  }
};
