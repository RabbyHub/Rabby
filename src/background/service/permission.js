import { createPersistStore } from 'background/utils';

class Permission {
  init = async () => {
    this.store = await createPersistStore({ name: 'permission' });
  };

  addConnectedSite = (origin) => {
    this.store[origin] = 'setup';
  };

  hasPerssmion = (origin) => !!this.store[origin];

  getConnectedSites = () => {
    return Reflect.ownKeys(this.store);
  };

  removeConnectedSite = (origin) => {
    Reflect.deleteProperty(this.store, origin);
  };
}

export default new Permission();
