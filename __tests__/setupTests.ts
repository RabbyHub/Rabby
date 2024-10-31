import chrome from 'sinon-chrome';
import { TextEncoder, TextDecoder } from 'util';

// from https://github.com/clarkbw/jest-webextension-mock/blob/master/src/setup.js
global.chrome = chrome;
(global as any).browser = chrome;

const oldGet = global.chrome.storage.local.get;

chrome.storage = {
  ...chrome.storage,
  local: {
    ...chrome.storage.local,
    get(key: string) {
      return new Promise((resolve, reject) => {
        oldGet(key, resolve);
      });
    },
  },
};

chrome.runtime = {
  ...chrome.runtime,
  getManifest() {
    return {
      name: '',
      version: '',
      manifest_version: 3,
    };
  },
};

// Firefox specific globals
// if (navigator.userAgent.indexOf('Firefox') !== -1) {
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Content_scripts#exportFunction
(global as any).exportFunction = jest.fn((func) => func);
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Content_scripts#cloneInto
(global as any).cloneInto = jest.fn((obj) => obj);

// https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
Object.assign(global, { TextDecoder, TextEncoder });
