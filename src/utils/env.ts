import browser from 'webextension-polyfill';

export const getSentryEnv = () => {
  let environment = 'production';

  if (process.env.DEBUG) {
    environment = 'debug';
  }

  if (process.env.NODE_ENV === 'development') {
    environment = 'development';
  }

  return environment;
};

export const appIsDebugPkg =
  `${process.env.DEBUG}` === 'true' && process.env.BUILD_ENV === 'PRO';

export const appIsProd = process.env.NODE_ENV === 'production';
export const appIsDev = !appIsProd;

export const isManifestV3 =
  browser.runtime.getManifest().manifest_version === 3;
