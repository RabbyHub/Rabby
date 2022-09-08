import {
  HDKeyringParams,
  HdKeyringType,
} from '@/background/service/keyring/hd-proxy';
import { BetterJSON } from '@/utils/better-json';
import PortMessage from '@/utils/message/portMessage';
import { browser } from 'webextension-polyfill-ts';
import { BitBox02Keyring } from './bitbox02';
import { LatticeKeyring } from './lattice';
import { LedgerKeyring } from './ledger';
import { OneKeyKeyring } from './onekey';
import { TrezorKeyring } from './trezor';

const KEYRING_CLASS: Record<HdKeyringType, any> = {
  LEDGER: LedgerKeyring,
  BITBOX02: BitBox02Keyring,
  TREZOR: TrezorKeyring,
  ONEKEY: OneKeyKeyring,
  GRIDPLUS: LatticeKeyring,
};

const cached = new Map<string, any>();

async function createKeyring(id: string, type: string, options?: any) {
  const KeyringClass = KEYRING_CLASS[type];
  if (!KeyringClass) {
    throw new Error('Keyring type not found');
  }
  const keyring = new KeyringClass(options);
  cached.set(id, keyring);

  try {
    await keyring.init();
  } catch (e) {
    /**
     * Maybe iframe connect not ready yet
     * or connect hid devices must be triggered by user action
     * Anyway, just wait click button to retry
     */
    console.error(`Init ${id}`, e);
  }

  return keyring;
}

export const connectKeyringService = () => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'keyring') {
      return;
    }
    const pm = new PortMessage(port);

    pm.listen(async (data) => {
      console.log('method', data.method, data.type, data.params);
      const params = BetterJSON.tryParse<{
        data?: any;
        type?: string;
        options?: any;
      }>(data.params);

      if (data.type === 'init') {
        const { data: cachedData } = data.params;
        for (const [key, value] of Object.entries<string>(cachedData)) {
          const { type, options } =
            BetterJSON.tryParse<HDKeyringParams>(value) ?? {};
          if (type) await createKeyring(key, type, options);
        }
        return;
      } else if (data.type === 'getHDKeyring') {
        const { type, options } = params ?? {};
        if (type) await createKeyring(data.id, type, options);
        return;
      } else if (data.type === 'invoke') {
        const keyring = cached.get(data.id);

        if (keyring) {
          const result = await keyring[data.method]?.(
            ...((params as []) ?? [])
          );

          console.log('invoke result', result);
          return BetterJSON.stringify(result);
        }
      }
    });

    port.onDisconnect.addListener(() => {
      cached.forEach((keyring) => {
        keyring?.close();
      });
    });
  });
};

browser.runtime.sendMessage('init-connect-keyring-service');
