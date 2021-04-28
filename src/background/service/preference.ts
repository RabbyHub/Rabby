import { createPersistStore } from 'background/utils';

class Preference {
  store: any

  init = async () => {
    this.store = await createPersistStore({ name: 'preference' });
  };

  setup = () => {
    this.store.setup = true;
  };

  isSetup = () => this.store.setup;

  getCurrentAccount = () => this.store.currentAccount;

  setCurrentAccount = (val) => {
    this.store.currentAccount = val;
  };

  setPopupOpen = (isOpen) => {
    this.store.popupOpen = isOpen;
  };
}

export default new Preference();
