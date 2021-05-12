import { Tabs, browser } from 'webextension-polyfill-ts';
import { Wallet } from 'background/controller/wallet';
import { ConnectedSite } from 'background/service/permission';

export const getCurrentTab = async (): Promise<Tabs.Tab> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });

  return tabs[0];
};

export const getCurrentConnectSite = async (wallet: Wallet) => {
  const { id } = await getCurrentTab();
  if (!id) return null;
  return wallet.getCurrentConnectedSite(id);
};
