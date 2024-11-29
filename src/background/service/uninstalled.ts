import { createPersistStore } from 'background/utils';
import { keyringService, transactionHistoryService } from '.';
import { KEYRING_CLASS } from '@/constant';
import browser from 'webextension-polyfill';

export type UninstalledStore = {
  imported: boolean;
  tx?: boolean;
  wallet?: boolean;
};

class Uninstalled {
  store: UninstalledStore = {
    imported: false,
    tx: false,
    wallet: false,
  };

  init = async () => {
    const storage = await createPersistStore<UninstalledStore>({
      name: 'UninstalledMetric',
      template: {
        imported: false,
        tx: false,
        wallet: false,
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
      this.setImported();
      const hasWallet = typedAccounts.some((account) => {
        return ([
          KEYRING_CLASS.PRIVATE_KEY,
          KEYRING_CLASS.MNEMONIC,
          ...Object.values(KEYRING_CLASS.HARDWARE),
        ] as string[]).includes(account.type);
      });
      if (hasWallet) {
        this.setWallet();
      }
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

  setWalletByKeyringType = (keyringType: string) => {
    this.setImported();
    if (
      ([
        KEYRING_CLASS.PRIVATE_KEY,
        KEYRING_CLASS.MNEMONIC,
        ...Object.values(KEYRING_CLASS.HARDWARE),
      ] as string[]).includes(keyringType)
    ) {
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
    browser.runtime.setUninstallURL(
      // TODO: change to production url
      `https://rabby-io-git-feat-uninstall-feedback-debanker.vercel.app/uninstalled?r=${encodeURIComponent(
        search
      )}`
    );
  };
}

export default new Uninstalled();
