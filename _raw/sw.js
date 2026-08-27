// Register navigation interception synchronously before the lazy background
// bundle. MV3 service workers can otherwise miss a cold-start navigation.
importScripts('/go-rabby-link-router.js');

let scriptsLoadInitiated = false;

const TREZOR_BROWSER_TARGET = 'trezor-browser';
const TREZOR_POPUP_ORIGIN = 'https://connect.trezor.io';

const isAllowedTrezorPopup = (url) => {
  if (typeof url !== 'string') {
    return false;
  }

  if (url === 'trezor-usb-permissions.html') {
    return true;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.origin === TREZOR_POPUP_ORIGIN &&
      parsed.username === '' &&
      parsed.password === '' &&
      /(^|\/)popup\.html$/.test(parsed.pathname)
    );
  } catch (_) {
    return false;
  }
};

const describeRejectedTrezorUrl = (url) => {
  try {
    return `${typeof url}: ${JSON.stringify(url)}`;
  } catch (_) {
    return typeof url;
  }
};

const registerTrezorBrowserProxy = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message?.target !== TREZOR_BROWSER_TARGET ||
      sender.id !== chrome.runtime.id ||
      sender.url !== chrome.runtime.getURL('offscreen.html')
    ) {
      return false;
    }

    const execute = async () => {
      switch (message.action) {
        case 'trezor-browser-get-current-window':
          return chrome.windows.getCurrent();
        case 'trezor-browser-create-window': {
          const { url } = message.params || {};
          if (!isAllowedTrezorPopup(url)) {
            throw new Error(
              `Invalid Trezor Popup URL (${describeRejectedTrezorUrl(url)})`
            );
          }
          return chrome.windows.create({ url });
        }
        case 'trezor-browser-query-tabs': {
          const { active, currentWindow, windowId } = message.params || {};
          return chrome.tabs.query({ active, currentWindow, windowId });
        }
        case 'trezor-browser-create-tab': {
          const { url, index, active } = message.params || {};
          if (!isAllowedTrezorPopup(url)) {
            throw new Error(
              `Invalid Trezor Popup URL (${describeRejectedTrezorUrl(url)})`
            );
          }
          return chrome.tabs.create({ url, index, active });
        }
        case 'trezor-browser-get-tab':
          return chrome.tabs.get(message.params);
        case 'trezor-browser-update-tab': {
          const { tabId, updateProperties } = message.params || {};
          return chrome.tabs.update(tabId, {
            active: updateProperties?.active,
          });
        }
        case 'trezor-browser-remove-tab':
          return chrome.tabs.remove(message.params);
        default:
          throw new Error('Unsupported Trezor browser action');
      }
    };

    execute()
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  });
};

registerTrezorBrowserProxy();

const clearAlarms = async () => {
  const alarms = await chrome.alarms.getAll();
  alarms.forEach((alarm) => {
    if (/^ALARMS/.test(alarm.name)) {
      chrome.alarms.clear(alarm.name);
    }
  });
};

const importAllScripts = () => {
  if (scriptsLoadInitiated) {
    return;
  }

  try {
    importScripts(
      '/webextension-polyfill.js',
      '/background.js'
    );
    scriptsLoadInitiated = true;
  } catch (e) {
    console.error(e);
  }
};

const createOffscreen = async () => {
  if (!chrome.offscreen) {
    console.debug('Offscreen not available');
    return;
  }

  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: './offscreen.html',
    reasons: ['IFRAME_SCRIPTING'],
    justification:
      'Used for Hardware Wallet to communicate with the extension.',
  });

  console.debug('Offscreen iframe loaded');
};

const keepAlive = () => {
  // keep the service worker alive when messages are received
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    importAllScripts();
    return false;
  });
  // keep the service worker alive when tabs are activated
  chrome.tabs.onActivated.addListener(() => {
    importAllScripts();
    return false;
  });
};

/*
 * This content script is injected programmatically because
 * MAIN world injection does not work properly via manifest
 * https://bugs.chromium.org/p/chromium/issues/detail?id=634381
 */
const registerInPageContentScript = async () => {
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: 'pageProvider',
        matches: ['file://*/*', 'http://*/*', 'https://*/*'],
        js: ['pageProvider.js'],
        runAt: 'document_start',
        world: 'MAIN',
        allFrames: true,
      },
    ]);
  } catch (err) {
    console.warn(
      `Dropped attempt to register pageProvider content script. ${err}`
    );
  }
};

registerInPageContentScript();
clearAlarms();
createOffscreen();
keepAlive();

// ref https://stackoverflow.com/questions/66406672/how-do-i-import-scripts-into-a-service-worker-using-chrome-extension-manifest-ve
self.addEventListener('install', () => {
  console.log('installing service worker');
  importAllScripts();
});

// In MV3, Event handler must be added on the initial evaluation of worker script.
if (navigator?.usb) {
  navigator.usb.addEventListener('disconnect', (device) => {
    console.log('USB device disconnected', device);
  });
}
