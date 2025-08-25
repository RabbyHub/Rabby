import { createModel } from '@rematch/core';
import {
  AssetPosition,
  InfoClient,
  MarginSummary,
  OpenOrder,
} from '@rabby-wallet/hyperliquid-sdk';
import { Account } from '@/background/service/preference';
import { RootModel } from '.';
import { destroyPerpsSDK, getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { formatMarkData } from '../views/Perps/utils';
import { DEFAULT_TOP_ASSET } from '../views/Perps/constants';
import { ApproveSignatures } from '@/background/service/perps';

export interface PositionAndOpenOrder extends AssetPosition {
  openOrders: OpenOrder[];
}

export interface AccountSummary extends MarginSummary {
  withdrawable: string;
}

export interface MarketData {
  index: number;
  logoUrl: string;
  name: string;
  maxLeverage: number;
  minLeverage: number;
  maxUsdValueSize: string;
  szDecimals: number;
  pxDecimals: number;
  dayBaseVlm: string;
  dayNtlVlm: string;
  funding: string;
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

export type MarketDataMap = Record<string, MarketData>;

const buildMarketDataMap = (list: MarketData[]): MarketDataMap => {
  return list.reduce((acc, item) => {
    acc[item.name.toUpperCase()] = item;
    return acc;
  }, {} as MarketDataMap);
};

export interface PerpsState {
  // clearinghouseState: ClearinghouseState | null;
  positionAndOpenOrders: PositionAndOpenOrder[];
  accountSummary: AccountSummary | null;
  currentPerpsAccount: Account | null;
  marketData: MarketData[];
  marketDataMap: MarketDataMap;
  perpFee: number;
  isLogin: boolean;
  isInitialized: boolean;
  approveSignatures: ApproveSignatures;
}

export const perps = createModel<RootModel>()({
  state: {
    // clearinghouseState: null,
    positionAndOpenOrders: [],
    accountSummary: null,
    withdrawable: null,
    perpFee: 0.00045,
    currentPerpsAccount: null,
    marketData: [],
    marketDataMap: {},
    isLogin: false,
    isInitialized: false,
    approveSignatures: [],
  } as PerpsState,

  reducers: {
    setPerpFee(state, payload: number) {
      return {
        ...state,
        perpFee: payload,
      };
    },

    setMarketData(state, payload: MarketData[] | []) {
      const list = payload || [];
      return {
        ...state,
        marketData: list,
        marketDataMap: buildMarketDataMap(list as MarketData[]),
      };
    },

    setPositionAndOpenOrders(state, payload: PositionAndOpenOrder[] | []) {
      return {
        ...state,
        positionAndOpenOrders: payload,
      };
    },

    setAccountSummary(state, payload: AccountSummary | null) {
      return {
        ...state,
        accountSummary: payload,
      };
    },

    setCurrentPerpsAccount(state, payload: Account | null) {
      return {
        ...state,
        currentPerpsAccount: payload,
        isLogin: !!payload,
      };
    },

    setInitialized(state, payload: boolean) {
      return {
        ...state,
        isInitialized: payload,
      };
    },

    setApproveSignatures(state, payload: ApproveSignatures) {
      return {
        ...state,
        approveSignatures: payload,
      };
    },

    resetState(state) {
      return {
        ...state,
        positionAndOpenOrders: [],
        currentPerpsAccount: null,
        isLogin: false,
        isInitialized: false,
        approveSignatures: [],
      };
    },
  },

  effects: (dispatch) => ({
    async saveApproveSignatures(
      payload: {
        approveSignatures: ApproveSignatures;
        address: string;
      },
      rootState
    ) {
      dispatch.perps.setApproveSignatures(payload.approveSignatures);
      // rootState.app.wallet.saveSendApproveAfterDeposit(
      //   payload.address,
      //   JSON.stringify(payload.approveSignatures)
      // );
      const preferenceData = await rootState.app.wallet.getAgentWalletPreference(
        payload.address
      );
      if (preferenceData) {
        await rootState.app.wallet.updatePerpsAgentWalletPreference(
          payload.address,
          {
            ...preferenceData,
            approveSignatures: payload.approveSignatures,
          }
        );
      }
    },

    async fetchPositionAndOpenOrders(_address?: string) {
      const sdk = getPerpsSDK();
      try {
        const address = _address || '';
        const [clearinghouseState, openOrders] = await Promise.all([
          sdk.info.getClearingHouseState(address),
          sdk.info.getFrontendOpenOrders(address),
        ]);

        const positionAndOpenOrders = clearinghouseState.assetPositions.map(
          (position) => {
            return {
              ...position,
              openOrders: openOrders.filter(
                (order) => order.coin === position.position.coin
              ),
            };
          }
        );

        dispatch.perps.setPositionAndOpenOrders(positionAndOpenOrders);

        dispatch.perps.setAccountSummary({
          ...clearinghouseState.marginSummary,
          withdrawable: clearinghouseState.withdrawable,
        });
      } catch (error: any) {
        console.error('Failed to fetch clearinghouse state:', error);
      }
    },

    async loginPerpsAccount(payload: Account, rootState) {
      await rootState.app.wallet.setPerpsCurrentAddress(payload.address);
      dispatch.perps.setCurrentPerpsAccount(payload);
      dispatch.perps.refreshData();
      console.log('loginPerpsAccount success', payload.address);
    },

    async fetchClearinghouseState(_, rootState) {
      const sdk = getPerpsSDK();

      const clearinghouseState = await sdk.info.getClearingHouseState();

      dispatch.perps.setAccountSummary({
        ...clearinghouseState.marginSummary,
        withdrawable: clearinghouseState.withdrawable,
      });

      const openOrders = rootState.perps.positionAndOpenOrders.flatMap(
        (order) => order.openOrders
      );

      const positionAndOpenOrders = clearinghouseState.assetPositions.map(
        (position) => {
          return {
            ...position,
            openOrders: openOrders.filter(
              (order) => order.coin === position.position.coin
            ),
          };
        }
      );

      dispatch.perps.setPositionAndOpenOrders(positionAndOpenOrders);
    },

    async refreshData() {
      await dispatch.perps.fetchPositionAndOpenOrders(undefined);
    },

    async fetchMarketData(noLogin?: boolean) {
      if (noLogin) {
        const sdk = new InfoClient({
          masterAddress: '',
        });
        const marketData = await sdk.metaAndAssetCtxs(true);
        dispatch.perps.setMarketData(
          formatMarkData(marketData, DEFAULT_TOP_ASSET)
        );
        return;
      }

      const sdk = getPerpsSDK();
      const marketData = await sdk.info.metaAndAssetCtxs(true);
      dispatch.perps.setMarketData(
        formatMarkData(marketData, DEFAULT_TOP_ASSET)
      );
    },

    async fetchPerpFee() {
      // is not very matter, just wait for the other query api
      const sdk = getPerpsSDK();
      const res = await sdk.info.getUsersFees();

      const perpFee =
        Number(res.userCrossRate) * (1 - Number(res.activeReferralDiscount));

      dispatch.perps.setPerpFee(perpFee);
      return perpFee;
    },

    logout() {
      destroyPerpsSDK();

      dispatch.perps.resetState();
    },
  }),
});

export default perps;
