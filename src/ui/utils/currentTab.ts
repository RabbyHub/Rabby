import browser, { Tabs } from 'webextension-polyfill';

export const getCurrentTab = async (): Promise<Tabs.Tab | undefined> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });

  return tabs[0];
};
