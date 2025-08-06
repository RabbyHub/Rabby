import { createModel } from '@rematch/core';
import { RootModel } from '.';

export interface GiftEligibilityState {
  [address: string]: {
    isEligible: boolean;
    isChecked: boolean;
    isClaimed: boolean;
  };
}

export interface GiftState {
  giftEligibility: GiftEligibilityState;
  currentGiftEligible: boolean;
  hasClaimedGift: boolean;
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

        const isEligible = await store.app.wallet.checkGiftEligibility(
          targetAddress
        );
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
        console.log('🔍 claimGiftAsync - 开始执行', params);
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
        console.log('🔍 claimGiftAsync - 领取成功', success);
        if (success) {
          dispatch.gift.markGiftAsClaimed({ address: targetAddress });
          store.app.wallet.markGiftAsClaimed(targetAddress);
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
        const hasAnyAccountClaimedGift = await store.app.wallet.getHasAnyAccountClaimedGift();
        dispatch.gift.setField({ hasClaimedGift: hasAnyAccountClaimedGift });
      } catch (error) {
        console.error('Failed to check claimed gift status:', error);
      }
    },
  }),
});
