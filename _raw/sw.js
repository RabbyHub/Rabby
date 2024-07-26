let scriptsLoadInitiated = false;

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
      '/vendor/trezor/trezor-connect-webextension.js',
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

// keep the service worker alive
const keepAlive = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      },
    ]);
  } catch (err) {
    console.warn(
      `Dropped attempt to register pageProvider content script. ${err}`
    );
  }
};

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
