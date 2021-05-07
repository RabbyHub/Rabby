import { createPersistStore } from 'background/utils';

export interface ConnectSite {
  origin: string;
  icon: string;
  name: string;
  chain?: string;
  touchTimes: number;
}

type PermissionStore = {
  [key: string]: ConnectSite;
} & {
  orderedSites: ConnectSite[];
};

class Permission {
  store: PermissionStore | undefined;

  init = async () => {
    this.store = await createPersistStore<PermissionStore>({
      name: 'permission',
    });
  };

  addConnectedSite = (origin, name, icon) => {
    if (!this.store || this.store[origin]) return;

    this.store[origin] = { origin, name, icon, touchTimes: 0 };
    this.store.orderedSites.push(this.store[origin]);
  };

  touchConnectedSite = (origin) => {
    // reach max integer?
    this.store![origin].touchTimes = this.store![origin].touchTimes + 1;
    this.store!.orderedSites.sort(
      (pre, next) => pre.touchTimes - next.touchTimes
    );
  };

  hasPerssmion = (origin) => {
    return !!this.store?.[origin];
  };

  getConnectedSites = () => {
    return this.store?.orderedSites;
  };

  removeConnectedSite = (origin) => {
    if (!this.store) return;

    const idx = this.store!.orderedSites.indexOf(this.store![origin]);
    Reflect.deleteProperty(this.store, origin);
    this.store!.orderedSites.splice(idx, 1);
  };
}

export default new Permission();
