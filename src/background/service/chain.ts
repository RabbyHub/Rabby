import { CHAINS_ENUM, CHAINS } from 'consts';
import { createPersistStore } from 'background/utils';
// import { http } from 'background/utils';

interface ChainStore {
  enableChains: CHAINS_ENUM[];
}

interface Chain {
  id: number;
  name: string;
  hex: string;
  logo: string;
}

class ChainService {
  supportChainIds: string[] = [];
  store: ChainStore | null = null;

  init = async () => {
    this.store = await createPersistStore<ChainStore>({
      name: 'permission',
    });
    // this.supportChainIds = await http('get_support_id');
  };

  getEnabledChains = (): Chain[] => {
    if (!this.store) return [];

    return this.store.enableChains.map((chain) => CHAINS[chain]);
  };

  enableChain = (id: CHAINS_ENUM) => {
    if (!this.store || this.store.enableChains.find((chain) => chain === id))
      return;
    this.store.enableChains = [...this.store.enableChains, id];
  };

  disableChain = (id: CHAINS_ENUM) => {
    if (!this.store) return;

    const after = this.store.enableChains.filter((chain) => chain !== id);

    if (after.length <= 0) throw new Error('keep at least one chain enabled.');

    this.store.enableChains = after;
  };

  getSupportChains = (): Chain[] => {
    // TODO
    return [];
  };
}

export default new ChainService();
