import browser, { Tabs, Windows } from 'webextension-polyfill';
import { getUITypeName } from './index';

export { getCurrentTab } from './currentTab';

export const openInTab = async (
  url?: string,
  needClose = true
): Promise<Tabs.Tab> => {
  const tab = await browser.tabs.create({
    active: true,
    url,
  });

  const isDesktop = getUITypeName() === 'desktop';
  if (needClose && !isDesktop) window.close();

  return tab;
};

export const getCurrentWindow = async (): Promise<number | undefined> => {
  const { id } = await browser.windows.getCurrent({
    windowTypes: ['popup'],
  } as Windows.GetInfo);

  return id;
};

export const openInternalPageInTab = (
  path: string,
  useWebapi = true,
  needClose = true
) => {
  if (useWebapi) {
    openInTab(`./index.html#/${path}`, needClose);
  } else {
    window.open(`./index.html#/${path}`);
  }
};

export const TRUSTED_URLS = {
  chromeStoreUrl:
    'https://chromewebstore.google.com/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch',
  chromeStoreReviewsUrl:
    'https://chromewebstore.google.com/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch/reviews',
  // // notice, only logged google user can access this page
  // chromeStoreMyReviewUrl:
  //   'https://chromewebstore.google.com/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch/reviews/my-review',
};
export const openTrustedExternalWebsiteInTab = async (
  type: keyof typeof TRUSTED_URLS,
  needClose = false
) => {
  const url = TRUSTED_URLS[type];

  await browser.tabs.create({
    active: true,
    url,
  });
  if (needClose) window.close();
};
