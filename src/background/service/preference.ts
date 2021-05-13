import { createPersistStore } from 'background/utils';

interface PreferenceStore {
  currentAccount: string;
  popupOpen: boolean;
}

class Preference {
  store!: PreferenceStore;

  init = async () => {
    this.store = await createPersistStore<PreferenceStore>({
      name: 'preference',
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
