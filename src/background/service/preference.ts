import { createPersistStore } from 'background/utils';

interface PreferenceStore {
  currentAccount: string;
  popupOpen: boolean;
  hiddenAddresses: {
    type: string;
    address: string;
  }[];
}

class Preference {
  store!: PreferenceStore;

  init = async () => {
    this.store = await createPersistStore<PreferenceStore>({
      name: 'preference',
      template: {
        currentAccount: '',
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
  };

  showAddress = (type: string, address: string) => {
    this.store.hiddenAddresses = this.store.hiddenAddresses.filter((item) => {
      return item.type === type && item.address === address;
    });
  };

  getCurrentAccount = () => {
    return this.store.currentAccount;
  };

  setCurrentAccount = (val) => {
    this.store.currentAccount = val;
  };

  setPopupOpen = (isOpen) => {
    this.store.popupOpen = isOpen;
  };
}

export default new Preference();
