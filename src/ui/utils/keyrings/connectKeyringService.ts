import PortMessage from '@/utils/message/portMessage';
import { browser } from 'webextension-polyfill-ts';
import { LedgerKeyring } from './ledger';

const KEYRING_SDK_TYPES = {
  LedgerKeyring,
};

export const keyringTypes = Object.values(KEYRING_SDK_TYPES);

const cached = new Map<string, any>();

export const connectKeyringService = () => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'keyring') {
      return;
    }
    const pm = new PortMessage(port);

    pm.listen(async (data) => {
      console.log('method', data.method, data.type, data.params);

      if (data.type === 'getHDKeyring') {
        const KeyringClass = keyringTypes.find(
          (item) => item.type === data.params.type
        );

        if (KeyringClass) {
          const keyring = new KeyringClass();
          await keyring.init();
          cached[data.id] = keyring;
          console.log('init');
          return keyring;
        }
      } else if (data.type === 'invoke') {
        const keyring = cached[data.id];

        if (keyring) {
          const res = await keyring[data.method]?.(...data.params);
          console.log('result', res);
          return res;
        } else {
          const k = new LedgerKeyring();
          await k.init();
          const res = await k[data.method]?.(...data.params);
          console.log('result', res);
          return res;
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
