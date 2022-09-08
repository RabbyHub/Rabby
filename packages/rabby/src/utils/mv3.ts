import { browser } from 'webextension-polyfill-ts';

export const isManifestV3 = () =>
  browser.runtime.getManifest().manifest_version === 3;
