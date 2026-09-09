import fs from 'fs';
import path from 'path';
import vm from 'vm';

test('the worker responds to health probes without importing the wallet bundle', () => {
  const listeners: any[] = [];
  const importScripts = jest.fn();
  const context = {
    importScripts,
    chrome: {
      runtime: {
        id: 'rabby-test',
        onMessage: { addListener: (listener) => listeners.push(listener) },
      },
      alarms: { getAll: async () => [] },
      offscreen: { hasDocument: async () => true },
      tabs: { onActivated: { addListener: jest.fn() } },
      scripting: { registerContentScripts: async () => undefined },
    },
    self: { addEventListener: jest.fn() },
    navigator: {},
  };
  vm.runInNewContext(
    fs.readFileSync(path.resolve(__dirname, '../../_raw/sw.js'), 'utf8'),
    context
  );
  importScripts.mockClear();
  const response = jest.fn();
  const message = { type: 'RABBY_SW_HEALTH_CHECK', requestId: 'probe-1' };
  listeners.forEach((listener) =>
    listener(message, { id: 'rabby-test' }, response)
  );
  expect(response).toHaveBeenCalledTimes(1);
  expect(response).toHaveBeenCalledWith({
    type: 'RABBY_SW_HEALTH_RESPONSE',
    requestId: 'probe-1',
  });
  expect(importScripts).not.toHaveBeenCalled();

  response.mockClear();
  listeners.forEach((listener) =>
    listener(message, { id: 'another-extension' }, response)
  );
  expect(response).not.toHaveBeenCalled();

  listeners.forEach((listener) =>
    listener({ type: 'getBackgroundReady' }, { id: 'rabby-test' }, response)
  );
  expect(importScripts).toHaveBeenCalledWith(
    '/webextension-polyfill.js',
    '/background.js'
  );
});
