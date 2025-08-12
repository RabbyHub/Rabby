import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { isFullVersionAccountType } from '@/utils/account';

const CACHE_VALIDITY_PERIOD = 60 * 60 * 1000;

interface GiftEligibilityItem {
  isEligible: boolean;
  isChecked: boolean;
  isClaimed: boolean;
}

interface GiftEligibilityCacheItem {
  isEligible: boolean;
  timestamp: number;
  hasGasAccountLogin: boolean;
}

export const gift = createModel<RootModel>()({
  name: 'gift',

  state: {
    giftEligibility: {} as Record<string, GiftEligibilityItem>,
    giftEligibilityCache: {} as Record<string, GiftEligibilityCacheItem>,
    claimedGiftAddresses: [] as string[],
    giftUsdValue: 0,
    hasClaimedGift: false,
  },

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return { ...state, ...payload };
    },

    setGiftEligibility(
      state,
      payload: {
        address: string;
        isEligible: boolean;
        isChecked: boolean;
        isClaimed?: boolean;
        hasGasAccountLogin?: boolean;
        giftUsdValue?: number;
      }
    ) {
      const {
        address,
        isEligible,
        isChecked,
        isClaimed = false,
        hasGasAccountLogin,
        giftUsdValue,
      } = payload;
      const addressKey = address.toLowerCase();
      const existingData = state.giftEligibility[addressKey];

      const newState = {
        ...state,
        giftEligibility: {
          ...state.giftEligibility,
          [addressKey]: {
            isEligible,
            isChecked,
            isClaimed: isClaimed || existingData?.isClaimed || false,
          },
        },
        // 更新 giftUsdValue，只有当没有领取过gift且当前地址有资格时才设置值
        giftUsdValue:
          !state.hasClaimedGift && isEligible && !isClaimed
            ? giftUsdValue || 0
            : 0,
      };

      if (hasGasAccountLogin !== undefined) {
        const cacheItem = {
          isEligible,
          timestamp: Date.now(),
          hasGasAccountLogin,
        };

        newState.giftEligibilityCache = {
          ...state.giftEligibilityCache,
          [addressKey]: cacheItem,
        };
      }

      return newState;
    },

    setGiftUsdValue(state, payload: { giftUsdValue: number }) {
      return {
        ...state,
        giftUsdValue: payload.giftUsdValue,
      };
    },

    markGiftAsClaimed(state, payload: { address: string }) {
      const addressKey = payload.address.toLowerCase();
      const existingData = state.giftEligibility[addressKey];
      const newClaimedGiftAddresses = state.claimedGiftAddresses.includes(
        addressKey
      )
        ? state.claimedGiftAddresses
        : [...state.claimedGiftAddresses, addressKey];

      return {
        ...state,
        giftEligibility: {
          ...state.giftEligibility,
          [addressKey]: {
            ...(existingData || { isEligible: false, isChecked: true }),
            isClaimed: true,
            isEligible: false,
          },
        },
        giftEligibilityCache: {
          ...state.giftEligibilityCache,
          [addressKey]: {
            isEligible: false,
            timestamp: Date.now(),
            hasGasAccountLogin: false,
          },
        },
        claimedGiftAddresses: newClaimedGiftAddresses,
        hasClaimedGift: true, // 标记全局已有账号领取过gift
        giftUsdValue: 0, // 领取后不再显示gift
      };
    },

    clearGiftCache(state, payload: { address: string }) {
      const addressKey = payload.address.toLowerCase();
      const {
        [addressKey]: removed,
        ...restCache
      } = state.giftEligibilityCache;

      return {
        ...state,
        giftEligibilityCache: restCache,
      };
    },

    clearExpiredGiftCache(state) {
      const now = Date.now();
      const validCache: Record<string, GiftEligibilityCacheItem> = {};

      // 只保留未过期的缓存
      Object.entries(state.giftEligibilityCache).forEach(
        ([address, cacheItem]) => {
          const cacheAge = now - cacheItem.timestamp;
          if (cacheAge <= CACHE_VALIDITY_PERIOD) {
            validCache[address] = cacheItem;
          }
        }
      );

      return {
        ...state,
        giftEligibilityCache: validCache,
      };
    },
  },

  effects: (dispatch) => ({
    async checkGiftEligibilityAsync(
      params: {
        address?: string;
        currentAccount?: any;
      },
      store?
    ) {
      try {
        if (!store) {
          return false;
        }

        const { address, currentAccount } = params;
        const targetAddress = address || currentAccount?.address;
        if (!targetAddress) {
          return false;
        }

        if (!isFullVersionAccountType(currentAccount)) {
          dispatch.gift.setGiftEligibility({
            address: targetAddress,
            isEligible: false,
            isChecked: true,
          });
          return false;
        }

        const addressKey = targetAddress.toLowerCase();
        const currentState = store.gift as {
          giftEligibilityCache: Record<string, GiftEligibilityCacheItem>;
          claimedGiftAddresses: string[];
        };

        const hasAnyAccountClaimedGift = await store.app.wallet.getHasAnyAccountClaimedGift();
        if (hasAnyAccountClaimedGift) {
          dispatch.gift.setField({ hasClaimedGift: true });
          dispatch.gift.setGiftEligibility({
            address: targetAddress,
            isEligible: false,
            isChecked: true,
          });
          return false;
        }

        const cachedResult = currentState.giftEligibilityCache[addressKey];

        if (cachedResult) {
          const now = Date.now();
          const cacheAge = now - cachedResult.timestamp;

          if (cacheAge > CACHE_VALIDITY_PERIOD) {
            dispatch.gift.clearGiftCache({ address: targetAddress });
          } else {
            if (!cachedResult.isEligible) {
              dispatch.gift.setGiftEligibility({
                address: targetAddress,
                isEligible: false,
                isChecked: true,
                isClaimed: currentState.claimedGiftAddresses.includes(
                  addressKey
                ),
              });
              return false;
            }

            const gasAccountData = await store.app.wallet.getGasAccountSig();
            const hasGasAccountLogin = !!(
              gasAccountData.sig && gasAccountData.accountId
            );

            if (cachedResult.hasGasAccountLogin === hasGasAccountLogin) {
              dispatch.gift.setGiftEligibility({
                address: targetAddress,
                isEligible: cachedResult.isEligible,
                isChecked: true,
                isClaimed: currentState.claimedGiftAddresses.includes(
                  addressKey
                ),
              });
              return cachedResult.isEligible;
            } else {
              dispatch.gift.clearGiftCache({ address: targetAddress });
            }
          }
        }

        if (currentState.claimedGiftAddresses.includes(addressKey)) {
          dispatch.gift.setGiftEligibility({
            address: targetAddress,
            isEligible: false,
            isChecked: true,
            isClaimed: true,
          });
          return false;
        }

        // 缓存不存在或已失效，需要重新检查
        const gasAccountData = await store.app.wallet.getGasAccountSig();
        const hasGasAccountLogin = !!(
          gasAccountData.sig && gasAccountData.accountId
        );

        if (hasGasAccountLogin) {
          // 如果gas account已登录，直接返回false
          dispatch.gift.setGiftEligibility({
            address: targetAddress,
            isEligible: false,
            isChecked: true,
            hasGasAccountLogin,
          });
          return false;
        }

        // 调用API检查gift资格
        try {
          const apiResult = await store.app.wallet.openapi.checkGasAccountGiftEligibility(
            {
              id: targetAddress,
            }
          );
          const isEligible = apiResult.has_eligibility || false;
          const giftUsdValue = apiResult.can_claimed_usd_value || 0;

          dispatch.gift.setGiftEligibility({
            address: targetAddress,
            isEligible,
            isChecked: true,
            isClaimed: currentState.claimedGiftAddresses.includes(addressKey),
            hasGasAccountLogin: !isEligible ? hasGasAccountLogin : undefined,
            giftUsdValue: isEligible ? giftUsdValue : 0, // 只有当有资格时才设置 giftUsdValue
          });

          return isEligible;
        } catch (error) {
          console.error('Failed to check gift eligibility from API:', error);
          dispatch.gift.setGiftUsdValue({ giftUsdValue: 0 });
          return false;
        }
      } catch (error) {
        console.error('Failed to check gift eligibility:', error);
        return false;
      }
    },

    async initGiftStateAsync(store?) {
      if (!store) {
        return;
      }
      try {
        const hasAnyAccountClaimedGift = await store.app.wallet.getHasAnyAccountClaimedGift();
        dispatch.gift.setField({ hasClaimedGift: hasAnyAccountClaimedGift });
      } catch (error) {
        console.error('Failed to check claimed gift status:', error);
      }
    },
  }),
});
