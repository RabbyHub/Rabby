import { Tabs, browser } from 'webextension-polyfill-ts';
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
