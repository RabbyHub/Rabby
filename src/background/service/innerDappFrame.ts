import { sessionService } from '.';
import { createPersistStore } from '../utils';
import type { Account } from './preference';

export type InnerDappType = 'perps' | 'prediction' | 'lending';

export interface InnerDappFrameServiceStore {
  innerDappAccounts: Record<string, Account>;
  perps: string;
  prediction: string;
  lending: string;
}
class InnerDappFrameService {
  store: InnerDappFrameServiceStore = {
    innerDappAccounts: {},
    perps: 'hyperliquid',
    prediction: 'polymarket',
    lending: 'aave',
  };

  init = async () => {
    const storageCache = await createPersistStore<InnerDappFrameServiceStore>({
      name: 'innerDappFrameService',
      template: {
        innerDappAccounts: {},
        perps: 'hyperliquid',
        prediction: 'polymarket',
        lending: 'aave',
      },
    });
    this.store = storageCache || this.store;
  };

  getInnerDappFrames = () => {
    return { ...this.store };
  };

  getInnerDappAccountByOrigin = (origin: string) => {
    return this.store.innerDappAccounts[origin];
  };
  setInnerDappAccount = (origin: string, account: Account) => {
    if (origin) {
      sessionService.broadcastEvent(
        'accountsChanged',
        [account.address],
        origin,
        undefined,
        true
      );
    }
    console.log('setInnerDappAccount', origin, account);
    this.store.innerDappAccounts[origin] = account;
  };

  setInnerDappId = (type: InnerDappType, id: string) => {
    this.store[type] = id;
  };
}

export const innerDappFrameService = new InnerDappFrameService();
