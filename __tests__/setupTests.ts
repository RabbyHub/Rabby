import chrome from 'sinon-chrome';
import { TextEncoder, TextDecoder } from 'util';

// from https://github.com/clarkbw/jest-webextension-mock/blob/master/src/setup.js
global.chrome = chrome;
(global as any).browser = chrome;

const stores = {
  local: {} as Record<string, unknown>,
  session: {} as Record<string, unknown>,
};

const createStorageArea = (store: Record<string, unknown>) => ({
  get: jest.fn(
    async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys === null || keys === undefined) return { ...store };
      if (typeof keys === 'string') return { [keys]: store[keys] };
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, store[key]]));
      }
      return Object.fromEntries(
        Object.entries(keys).map(([key, fallback]) => [
          key,
          store[key] === undefined ? fallback : store[key],
        ])
      );
    }
  ),
  set: jest.fn(async (values: Record<string, unknown>) => {
    Object.assign(store, values);
  }),
  remove: jest.fn(async (keys: string | string[]) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(store).forEach((key) => delete store[key]);
  }),
  getBytesInUse: jest.fn(async () => 0),
});

const storageAreas = {
  local: createStorageArea(stores.local),
  session: createStorageArea(stores.session),
};

chrome.runtime.getManifest.returns({
  manifest_version: 3,
  version: '0.0.0-test',
});
if (!chrome.storage.session) {
  Object.defineProperty(chrome.storage, 'session', {
    configurable: true,
    value: {},
  });
}
(['local', 'session'] as const).forEach((name) => {
  const target = chrome.storage[name];
  const source = storageAreas[name];
  Object.entries(source).forEach(([method, implementation]) => {
    if (!target[method]) target[method] = jest.fn();
    if (target[method].callsFake) {
      target[method].callsFake(implementation);
    } else {
      target[method].mockImplementation(implementation);
    }
  });
});

export const resetMockExtensionStorage = () => {
  Object.values(stores).forEach((store) =>
    Object.keys(store).forEach((key) => delete store[key])
  );
  Object.values(storageAreas).forEach((area) => {
    area.get.mockClear();
    area.set.mockClear();
    area.remove.mockClear();
    area.clear.mockClear();
    area.getBytesInUse.mockClear();
  });
};

// Firefox specific globals
// if (navigator.userAgent.indexOf('Firefox') !== -1) {
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Content_scripts#exportFunction
(global as any).exportFunction = jest.fn((func) => func);
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Content_scripts#cloneInto
(global as any).cloneInto = jest.fn((obj) => obj);

// https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
Object.assign(global, { TextDecoder, TextEncoder });
