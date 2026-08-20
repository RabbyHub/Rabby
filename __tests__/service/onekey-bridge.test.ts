jest.mock('@onekeyfe/hd-core', () => ({
  UI_EVENT: 'ui-event',
  UI_REQUEST: {
    REQUEST_PIN: 'request-pin',
    REQUEST_PASSPHRASE: 'request-passphrase',
  },
  UI_RESPONSE: {
    RECEIVE_PIN: 'receive-pin',
    RECEIVE_PASSPHRASE: 'receive-passphrase',
  },
}));

const init = jest.fn(() => Promise.resolve());
const on = jest.fn();

jest.mock('@onekeyfe/hd-web-sdk', () => ({
  __esModule: true,
  default: {
    HardwareWebSdk: {
      init,
      on,
      uiResponse: jest.fn(),
    },
  },
}));

import OneKeyBridge from '@/background/service/keyring/eth-onekey-keyring/onekey-bridge';

describe('OneKeyBridge', () => {
  it('initializes the SDK and UI listener once for concurrent bridge inits', async () => {
    const bridges = [
      new OneKeyBridge(),
      new OneKeyBridge(),
      new OneKeyBridge(),
    ];

    await Promise.all(bridges.map((bridge) => bridge.init()));

    expect(init).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledTimes(1);
  });
});
