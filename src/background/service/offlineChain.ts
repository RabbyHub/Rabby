import { createPersistStore } from 'background/utils';

interface OfflineChainsStore {
  closeTipsChains: string[];
}
class OfflineChainsService {
  store: OfflineChainsStore = {
    closeTipsChains: [],
  };

  init = async () => {
    const storage = await createPersistStore<OfflineChainsStore>({
      name: 'OfflineChains',
      template: {
        closeTipsChains: [],
      },
    });

    this.store = storage || this.store;
  };

  getCloseTipsChains = () => {
    return this.store.closeTipsChains;
  };

  setCloseTipsChains = (chains: string[]) => {
    this.store.closeTipsChains = [...this.store.closeTipsChains, ...chains];
  };
}

export default new OfflineChainsService();
