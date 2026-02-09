import { isSameAccount } from '@/utils/account';
import { preferenceService, sessionService } from '.';
import { createPersistStore } from '../utils';
import type { Account } from './preference';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

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
    this.store.innerDappAccounts[origin] = account;
  };

  setInnerDappId = (type: InnerDappType, id: string) => {
    this.store[type] = id;
  };

  removeAccountFromAllFrames(address: string, type: string, brand?: string) {
    if (address && type) {
      let changed = false;
      Object.entries(this.store.innerDappAccounts).forEach(([key, account]) => {
        if (
          isSameAccount(account, { address, type, brandName: brand || type })
        ) {
          delete this.store.innerDappAccounts[key];
          changed = true;
          const newAccount = preferenceService.getCurrentAccount();
          if (newAccount) {
            this.store.innerDappAccounts[key] = newAccount;
            sessionService.broadcastEvent(
              'accountsChanged',
              [newAccount.address],
              key,
              undefined,
              true
            );
          }
        }
      });
      if (changed) {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.INNER_DAPP_CHANGE.DAPP_CHANGED,
        });
      }
    }
  }
}

export const innerDappFrameService = new InnerDappFrameService();
