import { createPersistStore } from 'background/helper';

class Preference {
  init = async () => {
    this.store = await createPersistStore({ name: 'preference' });
  }

  hasVault = (v) => {
    if (typeof v !== 'undefined') {
      this.store['vault'] = v;
    } else {
      return this.store['vault'];
    }
  }

}

export default new Preference();
