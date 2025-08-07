import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { isFullVersionAccountType } from '@/utils/account';

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
    currentGiftEligible: false,
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
      }
    ) {
      const {
        address,
        isEligible,
        isChecked,
        isClaimed = false,
        hasGasAccountLogin,
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
        currentGiftEligible: !state.hasClaimedGift && isEligible && !isClaimed,
      };

      if (hasGasAccountLogin !== undefined) {
        newState.giftEligibilityCache = {
          ...state.giftEligibilityCache,
          [addressKey]: {
            isEligible,
            timestamp: Date.now(),
            hasGasAccountLogin,
          },
        };
      }

      return newState;
    },

    setCurrentGiftEligible(state, payload: { isEligible: boolean }) {
      return {
        ...state,
        currentGiftEligible: payload.isEligible,
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
        currentGiftEligible: false, // 领取后不再显示gift
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
          // 如果缓存显示不满足条件，直接返回false
          if (!cachedResult.isEligible) {
            dispatch.gift.setGiftEligibility({
              address: targetAddress,
              isEligible: false,
              isChecked: true,
              isClaimed: currentState.claimedGiftAddresses.includes(addressKey),
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
              isClaimed: currentState.claimedGiftAddresses.includes(addressKey),
            });
            return cachedResult.isEligible;
          } else {
            dispatch.gift.clearGiftCache({ address: targetAddress });
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

          dispatch.gift.setGiftEligibility({
            address: targetAddress,
            isEligible,
            isChecked: true,
            isClaimed: currentState.claimedGiftAddresses.includes(addressKey),
            hasGasAccountLogin: !isEligible ? hasGasAccountLogin : undefined,
          });

          return isEligible;
        } catch (error) {
          console.error('Failed to check gift eligibility from API:', error);
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
