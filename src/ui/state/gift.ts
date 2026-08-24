import { create } from 'zustand';

import type { Account } from '@/background/service/preference';
import { wallet } from '@/ui/wallet';
import { isFullVersionAccountType } from '@/utils/account';

const CACHE_VALIDITY_PERIOD = 60 * 60 * 1000;

export interface GiftEligibilityItem {
  isEligible: boolean;
  isChecked: boolean;
  isClaimed: boolean;
}

export interface GiftEligibilityCacheItem {
  isEligible: boolean;
  timestamp: number;
  hasGasAccountLogin: boolean;
}

export type GiftState = {
  giftEligibility: Record<string, GiftEligibilityItem>;
  giftEligibilityCache: Record<string, GiftEligibilityCacheItem>;
  claimedGiftAddresses: string[];
  giftUsdValue: number;
  hasClaimedGift: boolean;
  _pendingRequests: Record<string, Promise<boolean>>;
};

type GiftEligibilityPayload = {
  address: string;
  isEligible: boolean;
  isChecked: boolean;
  isClaimed?: boolean;
  hasGasAccountLogin?: boolean;
  giftUsdValue?: number;
};

export type GiftActions = {
  setField: (payload: Partial<GiftState>) => void;
  setGiftEligibility: (payload: GiftEligibilityPayload) => void;
  setGiftUsdValue: (payload: { giftUsdValue: number }) => void;
  markGiftAsClaimed: (payload: { address: string }) => void;
  clearGiftCache: (payload: { address: string }) => void;
  clearExpiredGiftCache: () => void;
  checkGiftEligibilityAsync: (params: {
    address?: string;
    currentAccount?: Account;
  }) => Promise<boolean>;
  initGiftStateAsync: () => Promise<void>;
};

export type GiftStore = GiftState & GiftActions;

export const getDefaultGiftState = (): GiftState => ({
  giftEligibility: {},
  giftEligibilityCache: {},
  claimedGiftAddresses: [],
  giftUsdValue: 0,
  hasClaimedGift: false,
  _pendingRequests: {},
});

export const useGiftStore = create<GiftStore>()((set, get) => ({
  ...getDefaultGiftState(),

  setField(payload) {
    set(payload);
  },
  setGiftEligibility(payload) {
    const {
      address,
      isEligible,
      isChecked,
      isClaimed = false,
      hasGasAccountLogin,
      giftUsdValue,
    } = payload;
    const addressKey = address.toLowerCase();

    set((state) => {
      const nextState: Partial<GiftState> = {
        giftEligibility: {
          ...state.giftEligibility,
          [addressKey]: {
            isEligible,
            isChecked,
            isClaimed:
              isClaimed ||
              state.giftEligibility[addressKey]?.isClaimed ||
              false,
          },
        },
        giftUsdValue:
          !state.hasClaimedGift && isEligible && !isClaimed
            ? giftUsdValue || 0
            : 0,
      };

      if (hasGasAccountLogin !== undefined) {
        nextState.giftEligibilityCache = {
          ...state.giftEligibilityCache,
          [addressKey]: {
            isEligible,
            timestamp: Date.now(),
            hasGasAccountLogin,
          },
        };
      }

      return nextState;
    });
  },
  setGiftUsdValue({ giftUsdValue }) {
    set({ giftUsdValue });
  },
  markGiftAsClaimed({ address }) {
    const addressKey = address.toLowerCase();
    set((state) => ({
      giftEligibility: {
        ...state.giftEligibility,
        [addressKey]: {
          ...(state.giftEligibility[addressKey] || {
            isEligible: false,
            isChecked: true,
          }),
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
      claimedGiftAddresses: state.claimedGiftAddresses.includes(addressKey)
        ? state.claimedGiftAddresses
        : [...state.claimedGiftAddresses, addressKey],
      hasClaimedGift: true,
      giftUsdValue: 0,
    }));
  },
  clearGiftCache({ address }) {
    const addressKey = address.toLowerCase();
    set((state) => {
      const giftEligibilityCache = { ...state.giftEligibilityCache };
      delete giftEligibilityCache[addressKey];
      return { giftEligibilityCache };
    });
  },
  clearExpiredGiftCache() {
    const now = Date.now();
    set((state) => ({
      giftEligibilityCache: Object.fromEntries(
        Object.entries(state.giftEligibilityCache).filter(
          ([, cacheItem]) => now - cacheItem.timestamp <= CACHE_VALIDITY_PERIOD
        )
      ),
    }));
  },
  async checkGiftEligibilityAsync({ address, currentAccount }) {
    try {
      const targetAddress = address || currentAccount?.address;
      if (!targetAddress) {
        return false;
      }

      if (!currentAccount || !isFullVersionAccountType(currentAccount)) {
        get().setGiftEligibility({
          address: targetAddress,
          isEligible: false,
          isChecked: true,
        });
        return false;
      }

      const addressKey = targetAddress.toLowerCase();
      const hasAnyAccountClaimedGift = await wallet.getHasAnyAccountClaimedGift();
      if (hasAnyAccountClaimedGift) {
        get().setField({ hasClaimedGift: true });
        get().setGiftEligibility({
          address: targetAddress,
          isEligible: false,
          isChecked: true,
        });
        return false;
      }

      const cachedResult = get().giftEligibilityCache[addressKey];
      if (cachedResult) {
        if (Date.now() - cachedResult.timestamp > CACHE_VALIDITY_PERIOD) {
          get().clearGiftCache({ address: targetAddress });
        } else if (!cachedResult.isEligible) {
          get().setGiftEligibility({
            address: targetAddress,
            isEligible: false,
            isChecked: true,
            isClaimed: get().claimedGiftAddresses.includes(addressKey),
          });
          return false;
        } else {
          const gasAccountData = await wallet.getGasAccountSig();
          const hasGasAccountLogin = !!(
            gasAccountData.sig && gasAccountData.accountId
          );

          if (cachedResult.hasGasAccountLogin === hasGasAccountLogin) {
            get().setGiftEligibility({
              address: targetAddress,
              isEligible: cachedResult.isEligible,
              isChecked: true,
              isClaimed: get().claimedGiftAddresses.includes(addressKey),
            });
            return cachedResult.isEligible;
          }
          get().clearGiftCache({ address: targetAddress });
        }
      }

      if (get().claimedGiftAddresses.includes(addressKey)) {
        get().setGiftEligibility({
          address: targetAddress,
          isEligible: false,
          isChecked: true,
          isClaimed: true,
        });
        return false;
      }

      const gasAccountData = await wallet.getGasAccountSig();
      const hasGasAccountLogin = !!(
        gasAccountData.sig && gasAccountData.accountId
      );

      if (hasGasAccountLogin) {
        get().setGiftEligibility({
          address: targetAddress,
          isEligible: false,
          isChecked: true,
          hasGasAccountLogin,
        });
        return false;
      }

      try {
        const requestKey = `gift_eligibility_${addressKey}`;
        const pendingRequests = get()._pendingRequests;
        const pendingRequest = pendingRequests[requestKey];
        if (pendingRequest) {
          return await pendingRequest;
        }

        const requestPromise = wallet.openapi
          .checkGasAccountGiftEligibility({ id: targetAddress })
          .then((apiResult) => {
            const isEligible = apiResult.has_eligibility || false;
            const giftUsdValue = apiResult.can_claimed_usd_value || 0;

            get().setGiftEligibility({
              address: targetAddress,
              isEligible,
              isChecked: true,
              isClaimed: get().claimedGiftAddresses.includes(addressKey),
              hasGasAccountLogin: !isEligible ? hasGasAccountLogin : undefined,
              giftUsdValue: isEligible ? giftUsdValue : 0,
            });
            return isEligible;
          });

        pendingRequests[requestKey] = requestPromise;
        try {
          return await requestPromise;
        } finally {
          const currentPendingRequests = get()._pendingRequests;
          if (currentPendingRequests[requestKey] === requestPromise) {
            delete currentPendingRequests[requestKey];
          }
        }
      } catch (error) {
        console.error('Failed to check gift eligibility from API:', error);
        get().setGiftUsdValue({ giftUsdValue: 0 });
        return false;
      }
    } catch (error) {
      console.error('Failed to check gift eligibility:', error);
      return false;
    }
  },
  async initGiftStateAsync() {
    try {
      const hasAnyAccountClaimedGift = await wallet.getHasAnyAccountClaimedGift();
      set({ hasClaimedGift: hasAnyAccountClaimedGift });
    } catch (error) {
      console.error('Failed to check claimed gift status:', error);
    }
  },
}));

export const initializeGiftStore = () =>
  useGiftStore.getState().initGiftStateAsync();

export const giftActions: GiftActions = new Proxy({} as GiftActions, {
  get(_target, property: keyof GiftActions) {
    return useGiftStore.getState()[property];
  },
});
