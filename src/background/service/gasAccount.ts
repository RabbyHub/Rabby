import { createPersistStore } from 'background/utils';

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
};

class GasAccountService {
  store: GasAccountServiceStore = {
    sig: undefined,
    accountId: undefined,
    hasAnyAccountClaimedGift: false,
  };

  init = async () => {
    const store = await createPersistStore<GasAccountServiceStore>({
      name: 'gasAccount',
      template: {
        hasAnyAccountClaimedGift: false,
      },
    });
    this.store = store || this.store;
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
    } else {
      this.store.sig = sig;
      this.store.accountId = account?.address;
      this.store.account = {
        address: account.address,
        brandName: account.brandName,
        type: account.type,
      };
    }
  };

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
