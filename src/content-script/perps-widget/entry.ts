/** perps-widget.js entry — the background injects it into a tab's top frame only when the widget is enabled. */

import browser from 'webextension-polyfill';
import { bootPerpsWidget } from './index';

const getHardcodedBlockedHosts = (): string[] => {
  const hosts = ['app.hyperliquid.xyz'];
  try {
    hosts.push(new URL(browser.runtime.getURL('')).hostname);
  } catch {
    // best-effort: skip if the extension origin can't be resolved
  }
  return hosts;
};

(async () => {
  try {
    const blockedHosts = (await browser.runtime.sendMessage({
      type: 'controller',
      method: 'getPerpsWidgetBlockedHosts',
      params: [],
    })) as string[];
    await bootPerpsWidget({
      enabled: true,
      blockedHosts: [
        ...getHardcodedBlockedHosts(),
        ...(Array.isArray(blockedHosts) ? blockedHosts : []),
      ],
    });
  } catch (err) {
    console.warn('[perps-widget] bootstrap failed', err);
  }
})();
