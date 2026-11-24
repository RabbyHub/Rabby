import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import sdkPackage from '@onekeyfe/hd-web-sdk/package.json';
import {
  OneKeyAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';
import OneKeyBridge from '@/background/service/keyring/eth-onekey-keyring/onekey-bridge';
import OneKeyOffscreenBridge from '@/background/service/keyring/eth-onekey-keyring/onekey-offscreen-bridge';
import { initOneKey } from '@/offscreen/scripts/onekey';

jest.mock('@onekeyfe/hd-core', () => ({
  UI_EVENT: 'ui',
  UI_REQUEST: { REQUEST_PIN: 'pin', REQUEST_PASSPHRASE: 'passphrase' },
  UI_RESPONSE: {
    RECEIVE_PIN: 'pin-reply',
    RECEIVE_PASSPHRASE: 'passphrase-reply',
  },
}));

jest.mock('@onekeyfe/hd-web-sdk', () => ({
  __esModule: true,
  default: {
    HardwareWebSdk: {
      init: jest.fn(),
      on: jest.fn(),
      uiResponse: jest.fn(),
      getDeviceState: jest.fn(),
      setDeviceConnectProtocol: jest.fn(),
      openWalletSession: jest.fn(),
      getPassphraseState: jest.fn(),
      evmGetPublicKey: jest.fn(),
      cancel: jest.fn(),
    },
  },
}));

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: { runtime: { id: 'rabby-extension', sendMessage: jest.fn() } },
}));

const sdk = jest.requireMock('@onekeyfe/hd-web-sdk').default.HardwareWebSdk;
const runtime = jest.requireMock('webextension-polyfill').default.runtime;

describe('OneKey SDK transport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retries failed initialization and replies only to SDK input requests', async () => {
    const bridge = new OneKeyBridge();
    sdk.init
      .mockRejectedValueOnce(new Error('iframe unavailable'))
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    await expect(bridge.init()).rejects.toThrow('iframe unavailable');
    await expect(bridge.init()).rejects.toThrow(
      'initialize the OneKey SDK iframe'
    );
    expect(sdk.on).not.toHaveBeenCalled();
    await Promise.all([bridge.init(), new OneKeyBridge().init()]);
    expect(sdk.init).toHaveBeenCalledTimes(3);
    expect(sdk.init).toHaveBeenLastCalledWith(
      expect.objectContaining({
        connectSrc: `https://jssdk.onekey.so/${sdkPackage.version}/`,
        env: 'webusb',
        fetchConfig: false,
      })
    );
    expect(sdk.on).toHaveBeenCalledTimes(1);
    const notify = sdk.on.mock.calls[0][1];
    for (const payload of [
      { deviceOnly: true },
      { interaction: { protocol: 'V2' } },
      { type: 'ButtonRequest_AttachPin' },
      { type: 'ButtonRequest_PinEntry' },
    ]) {
      notify({ type: UI_REQUEST.REQUEST_PIN, payload });
    }
    expect(sdk.uiResponse).not.toHaveBeenCalled();
    const responseCorrelation = {
      deviceId: 'paired-device',
      interactionId: 'input-request',
    };
    notify({ type: UI_REQUEST.REQUEST_PIN, payload: { responseCorrelation } });
    expect(sdk.uiResponse).toHaveBeenLastCalledWith({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
      ...responseCorrelation,
    });
    notify({
      type: UI_REQUEST.REQUEST_PASSPHRASE,
      payload: { responseCorrelation, deviceOnly: true },
    });
    expect(sdk.uiResponse).toHaveBeenLastCalledWith({
      type: UI_RESPONSE.RECEIVE_PASSPHRASE,
      payload: { value: '', passphraseOnDevice: true, save: true },
      ...responseCorrelation,
    });
  });

  it('keeps the runtime rejection when no offscreen receiver is available', async () => {
    const failure = new Error('Receiving end does not exist');
    runtime.sendMessage.mockRejectedValueOnce(failure);
    await expect(new OneKeyOffscreenBridge().init()).rejects.toBe(failure);
  });

  it('forwards calls and coded errors across the offscreen listener', async () => {
    const register = jest.spyOn(chrome.runtime.onMessage, 'addListener');
    try {
      initOneKey();
      const listener = register.mock.calls[0][0];
      const sender = { id: runtime.id };
      runtime.sendMessage.mockImplementation(
        (message) =>
          new Promise((resolve) => {
            expect(listener(message, sender, resolve)).toBe(true);
          })
      );
      const client = new OneKeyOffscreenBridge();
      const state = {
        success: true,
        payload: { identity: { deviceId: 'device' } },
      };
      sdk.getDeviceState.mockResolvedValue(state);
      await expect(
        client.getDeviceState('usb', { scope: 'runtime' })
      ).resolves.toEqual(state);
      expect(sdk.getDeviceState).toHaveBeenCalledWith('usb', {
        scope: 'runtime',
      });
      await client.setDeviceConnectProtocol('usb', 'V1');
      expect(sdk.setDeviceConnectProtocol).toHaveBeenCalledWith('usb', 'V1');
      await client.setDeviceConnectProtocol('usb', undefined);
      expect(sdk.setDeviceConnectProtocol).toHaveBeenLastCalledWith(
        'usb',
        undefined
      );
      sdk.openWalletSession.mockResolvedValue({
        success: true,
        payload: { walletType: 'standard' },
      });
      await client.openWalletSession('usb', { mode: 'standard' });
      expect(sdk.openWalletSession).toHaveBeenCalledWith('usb', {
        mode: 'standard',
      });
      await client.getPassphraseState('usb', { useEmptyPassphrase: true });
      expect(sdk.getPassphraseState).toHaveBeenCalledWith('usb', {
        useEmptyPassphrase: true,
      });
      sdk.evmGetPublicKey.mockRejectedValue({
        message: 'Device disconnected',
        errorCode: 107,
      });
      await expect(
        client.evmGetPublicKey('usb', 'device', { path: "m/44'/60'/0'" })
      ).rejects.toMatchObject({
        message: 'Device disconnected',
        code: 107,
      });
      const rejected = jest.fn();
      listener(
        {
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.cancel,
          params: ['usb'],
        },
        { id: runtime.id, tab: { id: 1 } } as chrome.runtime.MessageSender,
        rejected
      );
      expect(rejected).not.toHaveBeenCalled();
      expect(sdk.cancel).not.toHaveBeenCalled();
      await client.cancel('usb');
      expect(sdk.cancel).toHaveBeenCalledWith('usb');
    } finally {
      register.mockRestore();
    }
  });
});
