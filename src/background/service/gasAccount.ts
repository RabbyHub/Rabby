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
  pendingHardwareAccount?: {
    address: string;
    type: string;
    brandName: string;
  };
  autoLoginAccount?: {
    address: string;
    type: string;
    brandName: string;
  };
  accountsWithGasAccountBalance?: Array<{
    address: string;
    type: string;
    brandName: string;
  }>;
};

const isSameDiscoveryAccount = (
  a?: { address: string; type: string; brandName: string },
  b?: { address: string; type: string; brandName: string }
) =>
  a?.address?.toLowerCase() === b?.address?.toLowerCase() &&
  a?.type === b?.type &&
  a?.brandName === b?.brandName;

const isSameDiscoveryAccountList = (
  prev: GasAccountServiceStore['accountsWithGasAccountBalance'],
  next: GasAccountServiceStore['accountsWithGasAccountBalance']
) => {
  const prevList = prev || [];
  const nextList = next || [];

  if (prevList.length !== nextList.length) {
    return false;
  }

  return prevList.every((item, index) =>
    isSameDiscoveryAccount(item, nextList[index])
  );
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
    this.store.pendingHardwareAccount = undefined;
    this.store.autoLoginAccount = undefined;
    this.store.accountsWithGasAccountBalance = [];
  };

  getGasAccountData(): GasAccountServiceStore;
  getGasAccountData<K extends keyof GasAccountServiceStore>(
    key: K
  ): GasAccountServiceStore[K];
  getGasAccountData(key?: keyof GasAccountServiceStore) {
    return key ? this.store[key] : { ...this.store };
  }

  getGasAccountSig = () => {
    return { sig: this.store.sig, accountId: this.store.accountId };
  };

  hasGasAccountSession = () => !!this.store.sig && !!this.store.accountId;

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
      if (
        this.store.pendingHardwareAccount?.address?.toLowerCase() ===
        account.address.toLowerCase()
      ) {
        this.store.pendingHardwareAccount = undefined;
      }
      if (
        this.store.autoLoginAccount?.address?.toLowerCase() ===
        account.address.toLowerCase()
      ) {
        this.store.autoLoginAccount = undefined;
      }
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

  setDiscoveryState(
    payload: Pick<
      GasAccountServiceStore,
      | 'pendingHardwareAccount'
      | 'autoLoginAccount'
      | 'accountsWithGasAccountBalance'
    >
  ) {
    const nextAccountsWithGasAccountBalance =
      payload.accountsWithGasAccountBalance || [];
    const hasChanged =
      !isSameDiscoveryAccount(
        this.store.pendingHardwareAccount,
        payload.pendingHardwareAccount
      ) ||
      !isSameDiscoveryAccount(
        this.store.autoLoginAccount,
        payload.autoLoginAccount
      ) ||
      !isSameDiscoveryAccountList(
        this.store.accountsWithGasAccountBalance,
        nextAccountsWithGasAccountBalance
      );

    this.store.pendingHardwareAccount = payload.pendingHardwareAccount;
    this.store.autoLoginAccount = payload.autoLoginAccount;
    this.store.accountsWithGasAccountBalance = nextAccountsWithGasAccountBalance;

    if (hasChanged) {
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.GAS_ACCOUNT.DISCOVERY_UPDATED,
      });
    }
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
