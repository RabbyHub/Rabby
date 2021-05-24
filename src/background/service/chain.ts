import { CHAINS_ENUM, CHAINS } from 'consts';
import { createPersistStore } from 'background/utils';
import openapi from './openapi';

interface ChainStore {
  enableChains: CHAINS_ENUM[];
}

export interface Chain {
  id: number;
  name: string;
  hex: string;
  logo: string;
  enum: CHAINS_ENUM;
  serverId: string;
  network: number;
}

class ChainService {
  supportChains: Chain[] = [];
  store: ChainStore | null = null;

  init = async () => {
    this.store = await createPersistStore<ChainStore>({
      name: 'chains',
      template: {
        enableChains: Object.keys(CHAINS).map((key) => CHAINS[key].enum),
      },
    });

    this.supportChains = await this.loadSupportChains();
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

  loadSupportChains = async (): Promise<Chain[]> => {
    const chains = await openapi.getSupportedChains();
    const localChainArr = Object.values(CHAINS);
    const result: Chain[] = [];
    for (let i = 0; i < chains.length; i++) {
      const target = localChainArr.find(
        (item) => item.serverId === chains[i].id
      );
      if (target) result.push(target);
    }
    return result;
  };

  getSupportChains = () => this.supportChains;
}

export default new ChainService();
