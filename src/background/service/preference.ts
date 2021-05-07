import { createPersistStore } from 'background/utils';

interface PreferenceStore {
  currentAccount: string,
  popupOpen: boolean,
  setup: boolean
}

class Preference {
  store: PreferenceStore | undefined

  init = async () => {
    this.store = await createPersistStore<PreferenceStore>({ name: 'preference' });
  };

  setup = () => {
    if (!this.store) return;

    this.store.setup = true;
  };

  isSetup = () => {
    if (!this.store) return;

    return this.store.setup;
  }

  getCurrentAccount = () => {
    if (!this.store) return;

    return this.store.currentAccount;
  }

  setCurrentAccount = (val) => {
    if (!this.store) return;

    this.store.currentAccount = val;
  };

  setPopupOpen = (isOpen) => {
    if (!this.store) return;

    this.store.popupOpen = isOpen;
  };
}

export default new Preference();
