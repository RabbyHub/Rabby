import type { TrezorBridgeInterface } from '@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge-interface';
import EventEmitter from 'events';

import TrezorConnectWeb from '@trezor/connect-web';
import TrezorConnectWebExtension from '@trezor/connect-webextension';

import { isManifestV3 } from '@/utils/env';

type TrezorManifest = {
  appName: string;
  appUrl: string;
  email: string;
  appIcon?: string;
};

type TrezorConnectApi = typeof import('@trezor/connect-webextension').default;

// Connect 10 moved device access into Trezor Suite, so there is no USB
// transport or offscreen DOM to manage in Rabby anymore.
// - MV3: the service worker uses the webextension package, which talks to
//   Suite through externally_connectable.
// - MV2: the persistent background page keeps using the web/iframe flow;
//   Firefox cannot receive messages from web pages via externally_connectable.
const TrezorConnect: TrezorConnectApi = isManifestV3
  ? TrezorConnectWebExtension
  : (TrezorConnectWeb as TrezorConnectApi);

const CONNECT_ENV = isManifestV3 ? 'webextension' : 'web';

const DEFAULT_MANIFEST: TrezorManifest = {
  email: 'support@rabby.io',
  appName: 'Rabby Wallet',
  appUrl: 'https://rabby.io/',
};

let initialization: Promise<void> | undefined;
let manifest: TrezorManifest = DEFAULT_MANIFEST;

const ensureInitialized = () => {
  if (!initialization) {
    const attempt = (async () => {
      await TrezorConnect.init({
        manifest,
        env: CONNECT_ENV,
      });
    })();
    initialization = attempt;
    void attempt.catch(() => {
      if (initialization === attempt) initialization = undefined;
    });
  }
  return initialization;
};

export default class TrezorBridge implements TrezorBridgeInterface {
  isDeviceConnected = false;
  model = '';
  connectDevices = new Set<string>();
  event = new EventEmitter();

  private lastDeviceIdentity?: string;

  // Connect 10 has no DEVICE_EVENT. Invalidate the keyring's HD cache when a
  // response comes from a different device (or passphrase session) so stale
  // public keys are not reused after switching Trezor devices.
  private trackDevice(response: unknown) {
    const device = (response as {
      device?: {
        path?: string;
        state?: { staticSessionId?: string };
      };
    })?.device;
    if (!device) return;

    const identity = device.state?.staticSessionId || device.path;
    if (!identity) return;

    if (this.lastDeviceIdentity && this.lastDeviceIdentity !== identity) {
      this.event.emit('cleanUp', true);
    }
    this.lastDeviceIdentity = identity;
  }

  // The keyring does not await init. Keep the manifest for the first request
  // instead of touching Trezor Suite before the user starts an operation.
  init: TrezorBridgeInterface['init'] = async (config) => {
    if (config?.manifest) {
      manifest = { ...DEFAULT_MANIFEST, ...config.manifest };
    }
  };

  // Connect is a singleton shared by all keyring instances in the background.
  dispose: TrezorBridgeInterface['dispose'] = async () => {};

  getSigningDiagnostics = () => ({
    wallet_provider: 'trezor' as const,
    // Suite owns the transport; Connect 10 no longer reports USB/WebUSB.
    transport: 'unknown' as const,
    error_category: 'unknown' as const,
  });

  getPublicKey: TrezorBridgeInterface['getPublicKey'] = async (params) => {
    await ensureInitialized();
    const bundle = params.bundle.map(({ coin: _coin, ...item }) => item);
    const response = await TrezorConnect.ethereumGetPublicKey({ bundle });
    this.trackDevice(response);
    return response;
  };

  ethereumSignTransaction: TrezorBridgeInterface['ethereumSignTransaction'] = async (
    params
  ) => {
    await ensureInitialized();
    const response = await TrezorConnect.ethereumSignTransaction(params);
    this.trackDevice(response);
    return response;
  };

  ethereumSignMessage: TrezorBridgeInterface['ethereumSignMessage'] = async (
    params
  ) => {
    await ensureInitialized();
    const response = await TrezorConnect.ethereumSignMessage(params);
    this.trackDevice(response);
    return response;
  };

  ethereumSignTypedData: TrezorBridgeInterface['ethereumSignTypedData'] = async (
    params
  ) => {
    await ensureInitialized();
    const response = await TrezorConnect.ethereumSignTypedData(params);
    this.trackDevice(response);
    return response;
  };
}
