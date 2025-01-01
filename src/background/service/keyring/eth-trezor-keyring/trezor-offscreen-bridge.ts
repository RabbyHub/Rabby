import { TrezorBridgeInterface } from '@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge-interface';
import EventEmitter from 'events';

export default class TrezorOffscreenBridge implements TrezorBridgeInterface {
  isDeviceConnected = false;
  model = '';
  connectDevices = new Set<string>();
  event = new EventEmitter();

  init: TrezorBridgeInterface['init'] = async (config) => {
    globalThis.TrezorConnect.on('DEVICE_EVENT', (event: any) => {
      if (event && event.payload && event.payload.features) {
        this.model = event.payload.features.model;
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
      });
      this.isDeviceConnected = true;
    }
  };

  dispose = globalThis.TrezorConnect.dispose;

  getPublicKey = globalThis.TrezorConnect.getPublicKey;

  ethereumSignTransaction = globalThis.TrezorConnect.ethereumSignTransaction;

  ethereumSignMessage = globalThis.TrezorConnect.ethereumSignMessage;

  ethereumSignTypedData = globalThis.TrezorConnect.ethereumSignTypedData;
}
