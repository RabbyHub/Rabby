import { createPersistStore } from '@/background/utils';
import { Account } from './preference';

export interface GiftEligibilityCache {
  [address: string]: {
    isEligible: boolean;
    timestamp: number;
    hasGasAccountLogin: boolean;
  };
}

export interface GiftEligibilityServiceStore {
  eligibilityCache: GiftEligibilityCache;
  claimedAddresses: string[]; // 已经领取过gift的地址列表
}

class GiftEligibilityService {
  store!: GiftEligibilityServiceStore;

  init = async () => {
    const storage = await createPersistStore<GiftEligibilityServiceStore>({
      name: 'giftEligibility',
      template: {
        eligibilityCache: {},
        claimedAddresses: [],
      },
    });

    this.store = storage || this.store;
  };

  /**
   * 检查地址是否有gift资格
   * @param address 地址
   * @param hasGasAccountLogin 当前gas account是否已登录
   * @returns 是否有资格
   */
  async checkEligibility(
    address: string,
    hasGasAccountLogin: boolean,
  ): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();
    // 如果已经领取过gift，直接返回false
    if (this.store.claimedAddresses.includes(normalizedAddress)) {
      return false;
    }

    // 检查缓存
    const cached = this.store.eligibilityCache[normalizedAddress];
    if (cached) {
      // 如果缓存显示不满足条件，直接返回false
      if (!cached.isEligible) {
        return false;
      }
      // 如果gas account登录状态发生变化，需要重新检查
      if (cached.hasGasAccountLogin !== hasGasAccountLogin) {
        // 清除缓存，重新检查
        delete this.store.eligibilityCache[normalizedAddress];
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
  setEligibilityResult(
    address: string,
    isEligible: boolean,
    hasGasAccountLogin: boolean,
  ) {
    const normalizedAddress = address.toLowerCase();
    
    this.store.eligibilityCache[normalizedAddress] = {
      isEligible,
      timestamp: Date.now(),
      hasGasAccountLogin,
    };
  }

  /**
   * 标记地址已领取gift
   * @param address 地址
   */
  markAsClaimed(address: string) {
    const normalizedAddress = address.toLowerCase();
    if (!this.store.claimedAddresses.includes(normalizedAddress)) {
      this.store.claimedAddresses.push(normalizedAddress);
    }
    // 清除该地址的缓存
    delete this.store.eligibilityCache[normalizedAddress];
  }

  /**
   * 清除地址的缓存
   * @param address 地址
   */
  clearCache(address: string) {
    const normalizedAddress = address.toLowerCase();
    delete this.store.eligibilityCache[normalizedAddress];
  }

  /**
   * 获取缓存数据
   */
  getCache() {
    return this.store.eligibilityCache;
  }

  /**
   * 获取已领取地址列表
   */
  getClaimedAddresses() {
    return this.store.claimedAddresses;
  }

  /**
   * 移除已领取地址（主要用于测试）
   * @param address 地址
   */
  removeClaimedAddress(address: string) {
    const normalizedAddress = address.toLowerCase();
    this.store.claimedAddresses = this.store.claimedAddresses.filter(
      (addr) => addr !== normalizedAddress,
    );
  }
}

export default new GiftEligibilityService();
