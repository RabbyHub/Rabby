import { createPersistStore } from 'background/utils';
import { CustomMarket } from '@/ui/views/DesktopLending/config/market';

export interface LendingServiceStore {
  lastSelectedChain: CustomMarket;
  skipHealthFactorWarning: boolean;
}

class LendingService {
  private store?: LendingServiceStore;
  private initPromise?: Promise<void>;

  init = async () => {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = (async () => {
      const storage = await createPersistStore<LendingServiceStore>({
        name: 'lending',
        template: {
          lastSelectedChain: CustomMarket.proto_mainnet_v3,
          skipHealthFactorWarning: false,
        },
      });
      this.store = storage || this.store;
    })();
    return this.initPromise;
  };

  private ensureInitialized = async () => {
    if (!this.store) {
      await this.init();
    }
  };

  setLastSelectedChain = async (chainId: CustomMarket) => {
    await this.ensureInitialized();
    if (!this.store) {
      throw new Error('LendingService not initialized');
    }
    this.store.lastSelectedChain = chainId;
  };

  getLastSelectedChain = async () => {
    await this.ensureInitialized();
    if (!this.store) {
      throw new Error('LendingService not initialized');
    }
    return this.store.lastSelectedChain;
  };

  setSkipHealthFactorWarning = async (skip: boolean) => {
    await this.ensureInitialized();
    if (!this.store) {
      throw new Error('LendingService not initialized');
    }
    this.store.skipHealthFactorWarning = skip;
  };

  getSkipHealthFactorWarning = async () => {
    await this.ensureInitialized();
    if (!this.store) {
      throw new Error('LendingService not initialized');
    }
    return this.store.skipHealthFactorWarning;
  };
}

export default new LendingService();
