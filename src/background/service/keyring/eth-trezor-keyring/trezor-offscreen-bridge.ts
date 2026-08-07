import { TrezorBridgeInterface } from '@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge-interface';
import EventEmitter from 'events';
import type { HardwareSigningMetadata } from '../hardware-wallet-sentry';

export default class TrezorOffscreenBridge implements TrezorBridgeInterface {
  isDeviceConnected = false;
  model = '';
  connectDevices = new Set<string>();
  event = new EventEmitter();
  private hardwareSigningMetadata: HardwareSigningMetadata = {};

  init: TrezorBridgeInterface['init'] = async (config) => {
    globalThis.TrezorConnect.on('DEVICE_EVENT', (event: any) => {
      if (event && event.payload && event.payload.features) {
        const features = event.payload.features;
        this.model = features.model;
        this.hardwareSigningMetadata = {
          device_model: features.internal_model || features.model,
          firmware_version: [
            features.major_version,
            features.minor_version,
            features.patch_version,
          ].join('.'),
        };
      }
      const currentDeviceId = event.payload?.id;
      if (event.type === 'device-connect') {
        this.connectDevices.add(currentDeviceId);
        this.event.emit('cleanUp', true);
      }
      if (event.type === 'device-disconnect') {
        this.connectDevices.delete(currentDeviceId);
        this.event.emit('cleanUp', true);
      }
    });

    if (!this.isDeviceConnected) {
      globalThis.TrezorConnect.init({
        ...config,
        transports: ['BridgeTransport', 'WebUsbTransport'],
        connectSrc: 'https://connect.trezor.io/9/',
        manifest: {
          email: 'support@rabby.io',
          appName: 'Rabby Wallet',
          appUrl: 'https://rabby.io/',
        },
      });
      this.isDeviceConnected = true;
    }
  };

  getHardwareSigningMetadata = () => this.hardwareSigningMetadata;

  dispose = globalThis.TrezorConnect.dispose;

  getPublicKey = globalThis.TrezorConnect.getPublicKey;

  ethereumSignTransaction = globalThis.TrezorConnect.ethereumSignTransaction;

  ethereumSignMessage = globalThis.TrezorConnect.ethereumSignMessage;

  ethereumSignTypedData = globalThis.TrezorConnect.ethereumSignTypedData;
}
