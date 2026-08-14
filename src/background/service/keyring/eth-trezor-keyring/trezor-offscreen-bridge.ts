import type { TrezorBridgeInterface } from '@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge-interface';
import EventEmitter from 'events';
import browser from 'webextension-polyfill';

import {
  OffscreenCommunicationEvents,
  OffscreenCommunicationTarget,
  TrezorAction,
} from '@/constant/offscreen-communication';

import type { HardwareSigningMetadata } from '../hardware-wallet-sentry';

export default class TrezorOffscreenBridge implements TrezorBridgeInterface {
  isDeviceConnected = false;
  model = '';
  connectDevices = new Set<string>();
  event = new EventEmitter();

  private hardwareSigningMetadata: HardwareSigningMetadata = {};
  private listeningForDeviceEvents = false;
  private initializationConfig?: Parameters<TrezorBridgeInterface['init']>[0];
  private initialization?: Promise<void>;
  private disposal?: Promise<void>;

  private listenForDeviceEvents() {
    if (this.listeningForDeviceEvents) {
      return;
    }

    browser.runtime.onMessage.addListener((msg, sender) => {
      if (
        sender.id !== browser.runtime.id ||
        msg.target !== OffscreenCommunicationTarget.extension ||
        msg.event !== OffscreenCommunicationEvents.trezorDeviceEvent
      ) {
        return;
      }

      const event = msg.payload;
      const features = event?.payload?.features;
      if (features) {
        this.model = features.model;
        this.hardwareSigningMetadata = {
          device_model: features.internal_model || features.model,
          firmware_version: features.major_version
            ? `${features.major_version}.${features.minor_version}.${features.patch_version}`
            : undefined,
        };
      }

      const currentDeviceId = event?.payload?.id;
      if (event?.type === 'device-connect') {
        this.connectDevices.add(currentDeviceId);
        this.event.emit('cleanUp', true);
      } else if (event?.type === 'device-disconnect') {
        this.connectDevices.delete(currentDeviceId);
        this.event.emit('cleanUp', true);
      }
    });

    this.listeningForDeviceEvents = true;
  }

  private invoke<T>(action: TrezorAction, params?: unknown): Promise<T> {
    return browser.runtime
      .sendMessage({
        target: OffscreenCommunicationTarget.trezorOffscreen,
        action,
        params,
      })
      .then((response) => {
        if (response?.error) {
          throw new Error(response.error);
        }
        return response as T;
      });
  }

  private async ensureInitialized() {
    if (!this.initializationConfig) {
      throw new Error('Trezor bridge is not initialized');
    }

    if (this.disposal) {
      await this.disposal;
    }

    if (!this.initialization) {
      const attempt = this.invoke<void>(
        TrezorAction.init,
        this.initializationConfig
      );
      this.initialization = attempt;
      void attempt.catch(() => {
        if (this.initialization === attempt) {
          this.initialization = undefined;
          this.isDeviceConnected = false;
        }
      });
    }

    await this.initialization;
    this.isDeviceConnected = true;
  }

  private async invokeAfterInit<T>(action: TrezorAction, params?: unknown) {
    await this.ensureInitialized();
    return this.invoke<T>(action, params);
  }

  init: TrezorBridgeInterface['init'] = async (config) => {
    this.listenForDeviceEvents();
    this.initializationConfig = {
      ...config,
      transports: ['BridgeTransport', 'WebUsbTransport'],
      connectSrc: 'https://connect.trezor.io/9/',
      manifest: {
        email: 'support@rabby.io',
        appName: 'Rabby Wallet',
        appUrl: 'https://rabby.io/',
      },
    };
    await this.ensureInitialized();
  };

  getHardwareSigningMetadata = () => this.hardwareSigningMetadata;

  dispose: TrezorBridgeInterface['dispose'] = async () => {
    if (!this.disposal) {
      const pendingInitialization = this.initialization;
      this.initialization = undefined;

      const attempt = (async () => {
        await pendingInitialization?.catch(() => undefined);
        await this.invoke(TrezorAction.dispose);
      })();

      this.disposal = attempt;
      void attempt
        .finally(() => {
          if (this.disposal === attempt) {
            this.disposal = undefined;
          }
          this.isDeviceConnected = false;
          this.connectDevices.clear();
        })
        .catch(() => undefined);
    }

    return this.disposal;
  };

  getPublicKey: TrezorBridgeInterface['getPublicKey'] = (params) =>
    this.invokeAfterInit(TrezorAction.getPublicKey, params);

  ethereumSignTransaction: TrezorBridgeInterface['ethereumSignTransaction'] = (
    params
  ) => this.invokeAfterInit(TrezorAction.ethereumSignTransaction, params);

  ethereumSignMessage: TrezorBridgeInterface['ethereumSignMessage'] = (
    params
  ) => this.invokeAfterInit(TrezorAction.ethereumSignMessage, params);

  ethereumSignTypedData: TrezorBridgeInterface['ethereumSignTypedData'] = (
    params
  ) => this.invokeAfterInit(TrezorAction.ethereumSignTypedData, params);
}
