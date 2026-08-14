import {
  OffscreenCommunicationTarget,
  TrezorBrowserAction,
} from '@/constant/offscreen-communication';

type BrowserApiResponse<T> = T | { error: string };

const invokeBrowserApi = async <T>(
  action: TrezorBrowserAction,
  params?: unknown
) => {
  const response = (await chrome.runtime.sendMessage({
    target: OffscreenCommunicationTarget.trezorBrowser,
    action,
    params,
  })) as BrowserApiResponse<T>;

  if (response && typeof response === 'object' && 'error' in response) {
    throw new Error(response.error);
  }

  return response as T;
};

const callWithCallback = <T>(
  operation: Promise<T>,
  callback?: (result?: T) => void
) => {
  operation
    .then((result) => callback?.(result))
    .catch((error) => {
      if (
        error instanceof Error &&
        /^No tab with id: \d+\.$/.test(error.message)
      ) {
        callback?.();
        return;
      }

      console.error('[Trezor] Browser API proxy failed', error);
      callback?.();
    });
};

/**
 * MV3 offscreen documents only expose chrome.runtime. Trezor Connect uses the
 * presence of chrome.tabs to select its webextension Port channel, so proxy the
 * small browser API surface used by its PopupManager through the service worker.
 */
export const installTrezorBrowserApi = () => {
  const extensionChrome = chrome as any;

  if (!extensionChrome.tabs) {
    extensionChrome.tabs = {
      query: (
        queryInfo: chrome.tabs.QueryInfo,
        callback: (tabs?: chrome.tabs.Tab[]) => void
      ) =>
        callWithCallback(
          invokeBrowserApi<chrome.tabs.Tab[]>(
            TrezorBrowserAction.queryTabs,
            queryInfo
          ),
          callback
        ),
      create: (
        createProperties: chrome.tabs.CreateProperties,
        callback: (tab?: chrome.tabs.Tab) => void
      ) =>
        callWithCallback(
          invokeBrowserApi<chrome.tabs.Tab>(
            TrezorBrowserAction.createTab,
            createProperties
          ),
          callback
        ),
      get: (tabId: number, callback: (tab?: chrome.tabs.Tab) => void) =>
        callWithCallback(
          invokeBrowserApi<chrome.tabs.Tab>(TrezorBrowserAction.getTab, tabId),
          callback
        ),
      update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties) =>
        invokeBrowserApi<chrome.tabs.Tab>(TrezorBrowserAction.updateTab, {
          tabId,
          updateProperties,
        }),
      remove: (tabId: number, callback?: () => void) =>
        callWithCallback(
          invokeBrowserApi<void>(TrezorBrowserAction.removeTab, tabId),
          callback
        ),
    };
  }

  if (!extensionChrome.windows) {
    extensionChrome.windows = {
      getCurrent: (callback: (window?: chrome.windows.Window) => void) =>
        callWithCallback(
          invokeBrowserApi<chrome.windows.Window>(
            TrezorBrowserAction.getCurrentWindow
          ),
          callback
        ),
      create: (
        createData: chrome.windows.CreateData,
        callback: (window?: chrome.windows.Window) => void
      ) =>
        callWithCallback(
          invokeBrowserApi<chrome.windows.Window>(
            TrezorBrowserAction.createWindow,
            createData
          ),
          callback
        ),
    };
  }

  // The content script is declared in the manifest, so PopupManager does not
  // need to perform its optional scripting permission probe from offscreen.
  if (!extensionChrome.permissions) {
    extensionChrome.permissions = {
      getAll: (callback: (permissions: { permissions: string[] }) => void) =>
        callback({ permissions: [] }),
    };
  }
};
