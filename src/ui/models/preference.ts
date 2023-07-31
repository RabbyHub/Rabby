import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { TokenItem } from 'background/service/openapi';
import { GasCache, addedToken } from 'background/service/preference';
import { CHAINS_ENUM } from 'consts';

interface PreferenceState {
  externalLinkAck: boolean;
  useLedgerLive: boolean;
  locale: string;
  isDefaultWallet: boolean;
  lastTimeSendToken: Record<string, TokenItem>;
  walletSavedList: [];
  gasCache: GasCache;
  currentVersion: string;
  firstOpen: boolean;
  pinnedChain: string[];
  addedToken: addedToken;
  tokenApprovalChain: Record<string, CHAINS_ENUM>;
  nftApprovalChain: Record<string, CHAINS_ENUM>;
  autoLockTime: number;
  hiddenBalance: boolean;
  isShowTestnet: boolean;
}

export const preference = createModel<RootModel>()({
  name: 'preference',

  state: {
    externalLinkAck: false,
    useLedgerLive: false,
    locale: 'en',
    isDefaultWallet: true,
    lastTimeSendToken: {},
    walletSavedList: [],
    gasCache: {},
    currentVersion: '0',
    firstOpen: false,
    pinnedChain: [],
    addedToken: {},
    tokenApprovalChain: {},
    nftApprovalChain: {},
    autoLockTime: 0,
    hiddenBalance: false,
    isShowTestnet: false,
  } as PreferenceState,

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload || {}).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  effects: (dispatch) => ({
    init() {
      return this.getPreference();
    },
    async getPreference(key?: keyof PreferenceState, store?) {
      const value = await store.app.wallet.getPreference(key);
      if (key) {
        this.setField({
          [key]: value,
        });

        return value as PreferenceState[typeof key];
      } else {
        this.setField(value);
      }

      return value as PreferenceState;
    },
    async getIsDefaultWallet(_?, store?) {
      const isDefaultWallet = await store.app.wallet.isDefaultWallet();
      this.setField({
        isDefaultWallet,
      });
    },

    async setIsDefaultWallet(isDefault: boolean, store?) {
      await store.app.wallet.setIsDefaultWallet(isDefault);
      this.getIsDefaultWallet();
    },

    async getTokenApprovalChain(address: string, store?) {
      address = address.toLowerCase();
      const chain = await store.app.wallet.getTokenApprovalChain(address);

      this.setField({
        tokenApprovalChain: {
          ...store.preference.tokenApprovalChain,
          [address]: chain,
        },
      });
    },
    async setTokenApprovalChain(
      {
        address,
        chain,
      }: {
        address: string;
        chain: CHAINS_ENUM;
      },
      store?
    ) {
      await store.app.wallet.setTokenApprovalChain(address, chain);

      this.getTokenApprovalChain(address);
    },
    async setNFTApprovalChain(
      {
        address,
        chain,
      }: {
        address: string;
        chain: CHAINS_ENUM;
      },
      store?
    ) {
      await store.app.wallet.setNFTApprovalChain(address, chain);

      dispatch.preference.getPreference('nftApprovalChain');
    },
    async addPinnedChain(chain: CHAINS_ENUM, store?) {
      if (store.preference.pinnedChain.includes(chain)) {
        return;
      }
      await store.app.wallet.saveChain(chain);
      dispatch.preference.getPreference('pinnedChain');
    },
    async removePinnedChain(chain: CHAINS_ENUM, store?) {
      const list = store.preference.pinnedChain.filter(
        (item) => item !== chain
      );
      await store.app.wallet.updateChain(list);
      dispatch.preference.getPreference('pinnedChain');
    },
    async updatePinnedChainList(chains: CHAINS_ENUM[], store?) {
      dispatch.preference.setField({
        pinnedChain: chains,
      });
      await store.app.wallet.updateChain(chains);
      dispatch.preference.getPreference('pinnedChain');
    },
    async setAutoLockTime(time: number, store?) {
      dispatch.preference.setField({
        autoLockTime: time,
      });
      await store.app.wallet.setAutoLockTime(time);
      dispatch.preference.getPreference('autoLockTime');
    },
    async setHiddenBalance(hidden: boolean, store?) {
      dispatch.preference.setField({
        hiddenBalance: hidden,
      });
      await store.app.wallet.setHiddenBalance(hidden);
      dispatch.preference.getPreference('hiddenBalance');
    },
    async setIsShowTestnet(value: boolean, store?) {
      dispatch.preference.setField({
        isShowTestnet: value,
      });
      await store.app.wallet.setIsShowTestnet(value);
      dispatch.preference.getPreference('isShowTestnet');
    },

    // async setOpenapiHost(value: string, store?) {
    //   dispatch.preference.setField({
    //     isShowTestnet: value,
    //   });
    //   await store.app.wallet.setIsShowTestnet(value);
    //   dispatch.preference.getPreference('isShowTestnet');
    // },
  }),
});
