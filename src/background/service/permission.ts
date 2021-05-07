import { createPersistStore } from 'background/utils';

type PermissionStore = {
  [key: string]: string;
};

class Permission {
  store: PermissionStore | undefined;

  init = async () => {
    this.store = await createPersistStore<PermissionStore>({
      name: 'permission',
    });
  };

  addConnectedSite = (origin) => {
    if (!this.store) return;

    this.store[origin] = 'setup';
  };

  hasPerssmion = (origin) => {
    if (!this.store) return;

    return !!this.store[origin];
  };

  getConnectedSites = () => {
    if (!this.store) return;

    return Reflect.ownKeys(this.store);
  };

  removeConnectedSite = (origin) => {
    if (!this.store) return;

    Reflect.deleteProperty(this.store, origin);
  };
}

export default new Permission();
