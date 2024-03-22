const clearAlarms = async () => {
  const alarms = await chrome.alarms.getAll();
  alarms.forEach((alarm) => {
    if (/^ALARMS/.test(alarm.name)) {
      chrome.alarms.clear(alarm.name);
    }
  });
};

// clear all remaining alarms
clearAlarms();

try {
  importScripts('/webextension-polyfill.js', '/background.js');
} catch (e) {
  console.error(e);
}

async function createOffscreen() {
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
}

createOffscreen();

// keep the service worker alive
const keepAlive = () => {
  setInterval(() => {
    chrome.runtime.getPlatformInfo();
  }, 25000);
};

keepAlive();
