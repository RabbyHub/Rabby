import type { TrezorBridgeInterface } from '@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge-interface';
import TrezorConnect from '@trezor/connect-webextension';
import EventEmitter from 'events';

import type {
  HardwareSigningMetadata,
  SigningAttempt,
} from '../signing-diagnostics';
import { getTrezorSigningDiagnostics } from './signing-error';

const RABBY_MANIFEST = {
  email: 'support@rabby.io',
  appName: 'Rabby Wallet',
  appUrl: 'https://rabby.io/',
};

/**
 * MV3 bridge. Connect 10 no longer bundles the core: the service worker talks
 * to Trezor Suite (desktop over a local WebSocket, otherwise Suite Web in a
 * tab via `externally_connectable`), so it runs here directly instead of in
 * the offscreen document.
 *
 * Suite owns device selection and no longer forwards DEVICE_EVENT, so `model`
 * and `connectDevices` stay empty.
 */
export default class TrezorWebExtensionBridge implements TrezorBridgeInterface {
  isDeviceConnected = false;
  model = '';
  connectDevices = new Set<string>();
  event = new EventEmitter();

  private hardwareSigningMetadata: HardwareSigningMetadata = {};
  private initializationConfig?: Parameters<TrezorBridgeInterface['init']>[0];
  private initialization?: Promise<void>;
  private disposal?: Promise<void>;

  private async ensureInitialized() {
    const config = this.initializationConfig;
    if (!config) {
      throw new Error('Trezor bridge is not initialized');
    }

    if (this.disposal) {
      await this.disposal;
    }

    if (!this.initialization) {
      const attempt = TrezorConnect.init({
        ...config,
        manifest: RABBY_MANIFEST,
        coreMode: 'auto',
        env: 'webextension',
      });
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

  init: TrezorBridgeInterface['init'] = async (config) => {
    this.initializationConfig = config;
    await this.ensureInitialized();
  };

  getHardwareSigningMetadata = () => this.hardwareSigningMetadata;

  getSigningDiagnostics = (error?: unknown, _attempt?: SigningAttempt) => ({
    ...getTrezorSigningDiagnostics(error, this.failureCodeFor(error)),
    provider_metadata: this.hardwareSigningMetadata,
  });

  // The keyring rethrows a failed response with its message only, so keep the
  // Connect code here for diagnostics, with the message it came with.
  // ponytail: one slot per bridge; the device runs one signing call at a time.
  private lastFailure?: { code: string; message: string };

  // The kept code belongs to `error` only if the error carries its message:
  // an attempt can fail before reaching the bridge (e.g. in getHdPath), and
  // must not inherit an earlier attempt's code such as a user cancel.
  private failureCodeFor(error: unknown) {
    const failure = this.lastFailure;
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    return failure?.message && message.includes(failure.message)
      ? failure.code
      : undefined;
  }

  private async sign<T>(call: () => Promise<T>) {
    this.lastFailure = undefined;
    await this.ensureInitialized();
    const response: any = await call();
    if (response?.success === false) {
      // Connect 10 fails with `{ error: { message, code } }`; v9 used `payload`.
      const failure = response.error ?? response.payload;
      const code = failure?.code;
      const message = failure?.message ?? failure?.error;
      if (typeof code === 'string') {
        this.lastFailure = {
          code,
          message: typeof message === 'string' ? message : '',
        };
      }
    }
    return response as T;
  }

  dispose: TrezorBridgeInterface['dispose'] = async () => {
    if (!this.disposal) {
      const pendingInitialization = this.initialization;
      this.initialization = undefined;
      const attempt = (async () => {
        await pendingInitialization?.catch(() => undefined);
        await TrezorConnect.dispose();
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

  ethereumGetPublicKey = (async (params: any) => {
    await this.ensureInitialized();
    return TrezorConnect.ethereumGetPublicKey(params);
  }) as TrezorBridgeInterface['ethereumGetPublicKey'];

  ethereumSignTransaction = ((params: any) =>
    this.sign(() =>
      TrezorConnect.ethereumSignTransaction(params)
    )) as TrezorBridgeInterface['ethereumSignTransaction'];

  ethereumSignMessage = ((params: any) =>
    this.sign(() =>
      TrezorConnect.ethereumSignMessage(params)
    )) as TrezorBridgeInterface['ethereumSignMessage'];

  ethereumSignTypedData = ((params: any) =>
    this.sign(() =>
      TrezorConnect.ethereumSignTypedData(params)
    )) as TrezorBridgeInterface['ethereumSignTypedData'];
}
