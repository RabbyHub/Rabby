import { createPersistStore } from 'background/utils';
import { is } from 'immer/dist/internal';

export type GasAccountRecord = {
  chain_id: string;
  token_id: string;
  amount: number;
};

export interface GiftEligibilityCache {
  [address: string]: {
    isEligible: boolean;
    timestamp: number;
    hasGasAccountLogin: boolean;
  };
}

export type GasAccountServiceStore = {
  accountId?: string;
  sig?: string;
  account?: {
    address: string;
    type: string;
    brandName: string;
  };
  giftEligibilityCache: GiftEligibilityCache;
  claimedGiftAddresses: string[]; // 已经领取过gift的地址列表
};

class GasAccountService {
  store: GasAccountServiceStore = {
    sig: undefined,
    accountId: undefined,
    giftEligibilityCache: {},
    claimedGiftAddresses: [],
  };

  init = async () => {
    const storage = await createPersistStore<GasAccountServiceStore>({
      name: 'gasAccount',
      template: {
        giftEligibilityCache: {},
        claimedGiftAddresses: [],
      },
    });

    this.store = storage || this.store;
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
        ...account!,
      };
    }
  };

  // Gift eligibility methods
  /**
   * 检查地址是否有gift资格
   * @param address 地址
   * @param hasGasAccountLogin 当前gas account是否已登录
   * @returns 是否有资格
   */
  async checkGiftEligibility(
    address: string,
    hasGasAccountLogin: boolean
  ): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();
    // 如果已经领取过gift，直接返回false
    if (this.store.claimedGiftAddresses.includes(normalizedAddress)) {
      return false;
    }

    // 检查缓存
    const cached = this.store.giftEligibilityCache[normalizedAddress];
    if (cached) {
      // 如果缓存显示不满足条件，直接返回false
      if (!cached.isEligible) {
        return false;
      }
      // 如果gas account登录状态发生变化，需要重新检查
      if (cached.hasGasAccountLogin !== hasGasAccountLogin) {
        // 清除缓存，重新检查
        delete this.store.giftEligibilityCache[normalizedAddress];
      } else {
        // 缓存有效，直接返回结果
        return cached.isEligible;
      }
    }

    // 缓存不存在或已失效，需要重新检查
    return false; // 这里应该调用实际的API检查，暂时返回false
  }

  /**
   * 设置gift资格检查结果
   * @param address 地址
   * @param isEligible 是否有资格
   * @param hasGasAccountLogin 当前gas account是否已登录
   */
  setGiftEligibilityResult(
    address: string,
    isEligible: boolean,
    hasGasAccountLogin: boolean
  ) {
    const normalizedAddress = address.toLowerCase();
    this.store.giftEligibilityCache[normalizedAddress] = {
      isEligible,
      timestamp: Date.now(),
      hasGasAccountLogin,
    };
  }

  /**
   * 标记地址已领取gift
   * @param address 地址
   */
  markGiftAsClaimed(address: string) {
    const normalizedAddress = address.toLowerCase();
    if (!this.store.claimedGiftAddresses.includes(normalizedAddress)) {
      this.store.claimedGiftAddresses.push(normalizedAddress);
    }
    // 领取后将缓存中的数据标记为无资格，保留这个信息
    const existingCache = this.store.giftEligibilityCache[normalizedAddress];
    if (existingCache) {
      this.store.giftEligibilityCache[normalizedAddress] = {
        ...existingCache,
        isEligible: false, // 标记为无资格
      };
    } else {
      // 如果缓存不存在，创建一个标记为无资格的缓存
      this.store.giftEligibilityCache[normalizedAddress] = {
        isEligible: false,
        timestamp: Date.now(),
        hasGasAccountLogin: false,
      };
    }
  }

  /**
   * 清除地址的gift缓存
   * @param address 地址
   */
  clearGiftCache(address: string) {
    const normalizedAddress = address.toLowerCase();
    delete this.store.giftEligibilityCache[normalizedAddress];
  }

  /**
   * 清除全部gift缓存（测试用）
   */
  clearAllGiftCache() {
    console.log('Clearing all gift eligibility cache for testing...');
    this.store.giftEligibilityCache = {};
    this.store.claimedGiftAddresses = []; // 重置全局标记
  }

  /**
   * 获取gift缓存数据
   */
  getGiftCache() {
    return this.store.giftEligibilityCache;
  }

  /**
   * 获取已领取gift的地址列表
   */
  getClaimedGiftAddresses() {
    return this.store.claimedGiftAddresses;
  }
}

export default new GasAccountService();
