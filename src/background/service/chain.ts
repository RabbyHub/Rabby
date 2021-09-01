import { CHAINS_ENUM, CHAINS } from 'consts';
import { createPersistStore } from 'background/utils';
import openapi, { ServerChain } from './openapi';

interface ChainStore {
  enableChains: CHAINS_ENUM[];
  addedChains: CHAINS_ENUM[];
}

export interface Chain {
  id: number;
  name: string;
  hex: string;
  logo: string;
  enum: CHAINS_ENUM;
  serverId: string;
  network: string;
  nativeTokenSymbol: string;
  whiteLogo?: string;
  scanLink: string;
}

class ChainService {
  supportChains: Chain[] = [];
  store: ChainStore | null = null;

  init = async () => {
    this.store = await createPersistStore<ChainStore>({
      name: 'chains',
      template: {
        enableChains: Object.keys(CHAINS).map((key) => CHAINS[key].enum),
        addedChains: [],
      },
    });
    if (!this.store.addedChains) this.store.addedChains = [];
    this.supportChains = await this.loadSupportChains();
    this.syncNewChains();
  };

  syncNewChains = () => {
    if (!this.store) return;
    const needAdd = [CHAINS_ENUM.AVAX, CHAINS_ENUM.OP];
    for (let i = 0; i < needAdd.length; i++) {
      if (this.store.enableChains.includes(needAdd[i])) {
        if (!this.store.addedChains.includes(needAdd[i])) {
          this.store.addedChains = [...this.store.addedChains, needAdd[i]];
        }
      } else if (!this.store.addedChains.includes(needAdd[i])) {
        this.store.enableChains = [...this.store.enableChains, needAdd[i]];
        this.store.addedChains = [...this.store.addedChains, needAdd[i]];
      }
    }
  };

  getEnabledChains = (): Chain[] => {
    return this.supportChains
      .map((s) => {
        if (this.store?.enableChains.includes(s.enum)) {
          return s;
        }
      })
      .filter((s): s is Chain => !!s);
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
    let chains: ServerChain[] = [];
    try {
      chains = await openapi.getSupportedChains();
    } catch (e) {
      console.error('[rabby] get support chains failed', e);
    }
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
