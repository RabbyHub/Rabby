import { createPersistStore } from 'background/utils';
import { keyringService, transactionHistoryService } from '.';
import { KEYRING_CLASS } from '@/constant';
import browser from 'webextension-polyfill';

export type UninstalledStore = {
  imported: boolean;
  tx?: boolean;
  wallet?: boolean;
  local?: boolean;
};

class Uninstalled {
  store: UninstalledStore = {
    imported: false,
    tx: false,
    wallet: false,
    local: false,
  };

  init = async () => {
    const storage = await createPersistStore<UninstalledStore>({
      name: 'UninstalledMetric',
      template: {
        imported: false,
        tx: false,
        wallet: false,
        local: false,
      },
    });

    this.store = storage || this.store;
  };

  syncStatus = async () => {
    if (
      !this.store.tx &&
      transactionHistoryService.store.transactions &&
      Object.keys(transactionHistoryService.store.transactions).length
    ) {
      this.setTx();
      this.setImported();
    }

    if (this.store.wallet) {
      return;
    }

    const typedAccounts = await keyringService.getAllTypedAccounts();
    if (typedAccounts.length) {
      typedAccounts.forEach((account) => {
        this.setWalletByKeyringType(account.type);
      });
    }
  };

  setImported = () => {
    this.store.imported = true;
    this.setUninstalled();
  };

  setWallet = () => {
    this.store.wallet = true;
    this.setUninstalled();
  };

  setTx = () => {
    this.store.tx = true;
    this.setUninstalled();
  };

  setLocal = () => {
    this.store.local = true;
    this.setUninstalled();
  };

  setWalletByKeyringType = (keyringType: string) => {
    if (this.store.imported && this.store.wallet && this.store.local) {
      return;
    }
    this.setImported();
    let isLocal = false;
    let isHardware = false;
    isLocal = ([
      KEYRING_CLASS.PRIVATE_KEY,
      KEYRING_CLASS.MNEMONIC,
    ] as string[]).includes(keyringType);
    isHardware = ([
      ...Object.values(KEYRING_CLASS.HARDWARE),
    ] as string[]).includes(keyringType);
    if (isLocal) {
      this.setLocal();
    }
    if (isLocal || isHardware) {
      this.setWallet();
    }
  };

  setUninstalled = () => {
    let search = '';
    if (this.store.imported) {
      search = 'i';
    }
    if (this.store.wallet) {
      search += 'w';
    }

    if (this.store.tx) {
      search += 't';
    }
    if (this.store.local) {
      search += 'l';
    }
    browser.runtime.setUninstallURL(
      `https://rabby.io/uninstalled?r=${encodeURIComponent(search)}&v=${
        browser.runtime.getManifest().version
      }`
    );
  };
}

export default new Uninstalled();
