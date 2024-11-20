import browser, { Tabs } from 'webextension-polyfill';

export const openInTab = async (url?: string): Promise<Tabs.Tab> => {
  const tab = await browser.tabs.create({
    active: true,
    url,
  });

  return tab;
};
