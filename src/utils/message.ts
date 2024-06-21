import BroadcastChannelMessage from './message/broadcastChannelMessage';
import PortMessage from './message/portMessage';
import browser from 'webextension-polyfill';
import * as Sentry from '@sentry/browser';
import { EXTENSION_MESSAGES } from '@/constant/message';

export const Message = {
  BroadcastChannelMessage,
  PortMessage,
};

/**
 * Sends a message to the dapp(s) content script to signal it can connect to MetaMask background as
 * the backend is not active. It is required to re-connect dapps after service worker re-activates.
 * For non-dapp pages, the message will be sent and ignored.
 */
export const sendReadyMessageToTabs = async () => {
  const tabs = await browser.tabs
    .query({
      /**
       * Only query tabs that our extension can run in. To do this, we query for all URLs that our
       * extension can inject scripts in, which is by using the "<all_urls>" value and __without__
       * the "tabs" manifest permission. If we included the "tabs" permission, this would also fetch
       * URLs that we'd not be able to inject in, e.g. chrome://pages, chrome://extension, which
       * is not what we'd want.
       *
       * You might be wondering, how does the "url" param work without the "tabs" permission?
       *
       * @see {@link https://bugs.chromium.org/p/chromium/issues/detail?id=661311#c1}
       *  "If the extension has access to inject scripts into Tab, then we can return the url
       *   of Tab (because the extension could just inject a script to message the location.href)."
       */
      url: '<all_urls>',
      windowType: 'normal',
    })
    .then((result) => {
      return result;
    })
    .catch((e) => {
      console.error(e);
      throw e;
    });

  /** @todo we should only sendMessage to dapp tabs, not all tabs. */
  for (const tab of tabs) {
    if (tab.id != null) {
      browser.tabs
        .sendMessage(tab.id, {
          name: EXTENSION_MESSAGES.READY,
        })
        .then(() => {
          // console.log('sendReadyMessageToTabs', tab);
        })
        .catch((error) => {
          // An error may happen if the contentscript is blocked from loading,
          // and thus there is no runtime.onMessage handler to listen to the message.
          Sentry.captureException(error);
        });
    }
  }
};
