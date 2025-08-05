import { createModel } from '@rematch/core';
import { RootModel } from '.';

export interface GiftEligibilityState {
  [address: string]: {
    isEligible: boolean;
    isChecked: boolean; // 是否已经检查过该地址
    isClaimed: boolean; // 是否已经领取过gift
  };
}

export interface GiftState {
  // Gift eligibility state
  giftEligibility: GiftEligibilityState;
  currentGiftEligible: boolean; // 当前账号是否有资格显示gift
  hasClaimedGift: boolean; // 是否有任何账号已经领取过gift（一旦为true，所有账号都不再显示gift）
}

export const gift = createModel<RootModel>()({
  name: 'gift',

  state: {
    giftEligibility: {},
    currentGiftEligible: false,
    hasClaimedGift: false,
  } as GiftState,

  reducers: {
    setField(state, payload: Partial<GiftState>) {
      return { ...state, ...payload };
    },

    setGiftEligibility(
      state,
      payload: {
        address: string;
        isEligible: boolean;
        isChecked: boolean;
        isClaimed?: boolean;
      }
    ) {
      const { address, isEligible, isChecked, isClaimed = false } = payload;
      const addressKey = address.toLowerCase();
      const existingData = state.giftEligibility[addressKey];

      return {
        ...state,
        giftEligibility: {
          ...state.giftEligibility,
          [addressKey]: {
            isEligible,
            isChecked,
            isClaimed: isClaimed || existingData?.isClaimed || false,
          },
        },
        // 只有在没有任何账号领取过gift的情况下，才显示当前账号的gift资格
        currentGiftEligible: !state.hasClaimedGift && isEligible,
      };
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
      return {
        ...state,
        giftEligibility: {
          ...state.giftEligibility,
          [addressKey]: {
            ...(existingData || { isEligible: false, isChecked: true }),
            isClaimed: true,
            isEligible: false, // 领取后标记为无资格
          },
        },
        hasClaimedGift: true, // 标记全局已有账号领取过gift
        currentGiftEligible: false, // 领取后不再显示gift
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

        const hasAnyAccountClaimedGift = await store.app.wallet.getHasAnyAccountClaimedGift();
        if (hasAnyAccountClaimedGift) {
          dispatch.gift.setField({ hasClaimedGift: true });
          dispatch.gift.setCurrentGiftEligible({ isEligible: false });
          return false;
        }

        // 调用wallet检查资格
        const isEligible = await store.app.wallet.checkGiftEligibility(
          targetAddress
        );
        // 更新缓存
        dispatch.gift.setGiftEligibility({
          address: targetAddress,
          isEligible,
          isChecked: true,
        });

        return isEligible;
      } catch (error) {
        console.error('Failed to check gift eligibility:', error);
        dispatch.gift.setCurrentGiftEligible({ isEligible: false });
        return false;
      }
    },

    async claimGiftAsync(
      params: {
        address?: string;
        currentAccount?: any;
      },
      store?
    ) {
      try {
        console.log('🔍 claimGiftAsync - 开始执行');
        if (!store) {
          return false;
        }

        const { address, currentAccount } = params;
        const targetAddress = address || currentAccount?.address;
        if (!targetAddress) {
          return false;
        }

        // 调用API领取gift
        const success = await store.app.wallet.claimGasAccountGift(
          targetAddress
        );
        if (success) {
          // 领取成功，更新UI状态
          dispatch.gift.markGiftAsClaimed({ address: targetAddress });
          // 同时更新持久化的全局标记
          store.app.wallet.setHasAnyAccountClaimedGift(true);
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.error('Failed to claim gift:', error);
        return false;
      }
    },

    async initGiftStateAsync(store?) {
      if (!store) {
        return;
      }
      try {
        // 使用持久化的全局标记
        const hasAnyAccountClaimedGift = await store.app.wallet.getHasAnyAccountClaimedGift();
        dispatch.gift.setField({ hasClaimedGift: hasAnyAccountClaimedGift });
      } catch (error) {
        console.error('Failed to check claimed gift status:', error);
      }
    },
  }),
});
