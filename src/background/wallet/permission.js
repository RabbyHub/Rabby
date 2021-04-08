import { createPersistStore } from 'background/helper';

class Permission {
  sitesMetadata = new Map();

  init = async () => {
    this.store = await createPersistStore({ name: 'permission' });
  }

  addConnectedSite = (origin) => {
    // this.store[origin] = this.sitesMetadata.get(origin);
    // there should be more permmisons, like 'signMessage', 'signTx'
    this.store[origin] = 'accounts';
  }

  setSiteMetadata = (origin, metadata) => {
    this.sitesMetadata.set(origin, metadata);
  }

  hasPerssmion = (origin) => !!this.store[origin];

  getConnectedSites = () => {
    return Reflect.ownKeys(this.store);
  }

  removeConnectedSite = (origin) => {
    Reflect.deleteProperty(this.store, origin);
  }
}

export default new Permission();
