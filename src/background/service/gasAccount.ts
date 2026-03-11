import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { createPersistStore } from 'background/utils';
import dayjs from 'dayjs';

export type GasAccountRecord = {
  chain_id: string;
  token_id: string;
  amount: number;
};

export type GasAccountServiceStore = {
  accountId?: string;
  sig?: string;
  account?: {
    address: string;
    type: string;
    brandName: string;
  };
  hasAnyAccountClaimedGift: boolean; // 全局标记：是否有任何账号已经领取过gift
  hasEverLoggedIn: boolean;
  currentBalanceAccountId?: string;
  currentHasBalance?: boolean;
  ga4ActiveEventTime?: number;
};

class GasAccountService {
  store: GasAccountServiceStore = {
    sig: undefined,
    accountId: undefined,
    hasAnyAccountClaimedGift: false,
    hasEverLoggedIn: false,
    ga4ActiveEventTime: 0,
  };

  init = async () => {
    const store = await createPersistStore<GasAccountServiceStore>({
      name: 'gasAccount',
      template: {
        hasAnyAccountClaimedGift: false,
        hasEverLoggedIn: false,
        ga4ActiveEventTime: 0,
      },
    });
    this.store = store || this.store;
    if (this.store.sig && this.store.accountId) {
      this.store.hasEverLoggedIn = true;
    }
  };

  getGasAccountData = (key?: keyof GasAccountServiceStore) => {
    return key ? this.store[key] : { ...this.store };
  };

  getGasAccountSig = () => {
    return { sig: this.store.sig, accountId: this.store.accountId };
  };

  setGasAccountSig = (
    sig?: string,
    account?: GasAccountServiceStore['account']
  ) => {
    if (!sig || !account) {
      this.store.sig = undefined;
      this.store.accountId = undefined;
      this.store.account = undefined;
      this.store.currentBalanceAccountId = undefined;
      this.store.currentHasBalance = undefined;
    } else {
      this.store.sig = sig;
      this.store.accountId = account?.address;
      this.store.account = {
        address: account.address,
        brandName: account.brandName,
        type: account.type,
      };
    }
    eventBus.emit(EVENTS.broadcastToUI, {
      method:
        !sig || !account
          ? EVENTS.GAS_ACCOUNT.LOG_OUT
          : EVENTS.GAS_ACCOUNT.LOG_IN,
    });
  };

  markLoggedIn() {
    if (this.store.hasEverLoggedIn) {
      return false;
    }

    this.store.hasEverLoggedIn = true;
    return true;
  }

  getCurrentBalanceState() {
    return {
      accountId: this.store.currentBalanceAccountId,
      hasBalance: this.store.currentHasBalance,
    };
  }

  setCurrentBalanceState(accountId?: string, hasBalance?: boolean) {
    this.store.currentBalanceAccountId = accountId;
    this.store.currentHasBalance = hasBalance;
  }

  hasTrackedGa4ActiveToday() {
    return dayjs(this.store.ga4ActiveEventTime || 0)
      .utc()
      .isSame(dayjs().utc(), 'day');
  }

  markGa4ActiveTracked(timestamp = Date.now()) {
    this.store.ga4ActiveEventTime = timestamp;
  }

  /**
   * 标记地址已领取gift
   * @param address 地址
   */
  markGiftAsClaimed() {
    this.store.hasAnyAccountClaimedGift = true;
  }

  /**
   * 获取是否有任何账号已经领取过gift
   */
  getHasAnyAccountClaimedGift() {
    return this.store.hasAnyAccountClaimedGift;
  }

  /**
   * 设置是否有任何账号已经领取过gift
   */
  setHasAnyAccountClaimedGift(hasClaimed: boolean) {
    this.store.hasAnyAccountClaimedGift = hasClaimed;
  }
}

export default new GasAccountService();
