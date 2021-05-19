import { createPersistStore } from 'background/utils';
import { keyringService } from './index';

export interface Account {
  type: string;
  address: string;
}

interface PreferenceStore {
  currentAccount: Account | undefined;
  popupOpen: boolean;
  hiddenAddresses: Account[];
}

class Preference {
  store!: PreferenceStore;

  init = async () => {
    this.store = await createPersistStore<PreferenceStore>({
      name: 'preference',
      template: {
        currentAccount: undefined,
        popupOpen: false,
        hiddenAddresses: [],
      },
    });
  };

  getHiddenAddresses = () => {
    return this.store.hiddenAddresses;
  };

  hideAddress = (type: string, address: string) => {
    this.store.hiddenAddresses = [
      ...this.store.hiddenAddresses,
      {
        type,
        address,
      },
    ];
    if (
      type === this.store.currentAccount?.type &&
      address === this.store.currentAccount.address
    ) {
      this.resetCurrentAccount();
    }
  };

  /**
   * If current account be hidden or deleted
   * call this function to reset current account
   * to the first address in address list
   */
  resetCurrentAccount = async () => {
    const [account] = await keyringService.getAllVisibleAccountsArray();
    this.setCurrentAccount(account);
  };

  showAddress = (type: string, address: string) => {
    this.store.hiddenAddresses = this.store.hiddenAddresses.filter((item) => {
      return item.type !== type || item.address !== address;
    });
  };

  getCurrentAccount = () => {
    return this.store.currentAccount;
  };

  setCurrentAccount = (account: Account) => {
    this.store.currentAccount = account;
  };

  setPopupOpen = (isOpen) => {
    this.store.popupOpen = isOpen;
  };
}

export default new Preference();
