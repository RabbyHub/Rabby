import { createModel } from '@rematch/core';
import {
  AssetPosition,
  ClearinghouseState,
  InfoClient,
  MarginSummary,
  OpenOrder,
  UserFill,
  WsFill,
  WsUserFills,
} from '@rabby-wallet/hyperliquid-sdk';
import { Account } from '@/background/service/preference';
import { RootModel } from '.';
import { destroyPerpsSDK, getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { formatMarkData } from '../views/Perps/utils';
import { DEFAULT_TOP_ASSET } from '../views/Perps/constants';
import { ApproveSignatures } from '@/background/service/perps';
import { openapi } from './openapi';

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

export interface AccountHistoryItem {
  time: number;
  hash: string;
  type: 'deposit' | 'withdraw';
  status: 'pending' | 'success' | 'failed';
  usdValue: string;
}

export interface PerpsState {
  // clearinghouseState: ClearinghouseState | null;
  positionAndOpenOrders: PositionAndOpenOrder[];
  accountSummary: AccountSummary | null;
  currentPerpsAccount: Account | null;
  marketData: MarketData[];
  marketDataMap: MarketDataMap;
  hasPermission: boolean;
  perpFee: number;
  isLogin: boolean;
  isInitialized: boolean;
  approveSignatures: ApproveSignatures;
  userFills: WsFill[];
  userAccountHistory: AccountHistoryItem[];
  localLoadingHistory: AccountHistoryItem[];
  wsSubscriptions: (() => void)[];
  pollingTimer: NodeJS.Timeout | null;
}

export const perps = createModel<RootModel>()({
  state: {
    // clearinghouseState: null,
    positionAndOpenOrders: [],
    accountSummary: null,
    hasPermission: true,
    perpFee: 0.00045,
    currentPerpsAccount: null,
    marketData: [],
    userAccountHistory: [],
    localLoadingHistory: [],
    marketDataMap: {},
    isLogin: false,
    isInitialized: false,
    userFills: [],
    approveSignatures: [],
    wsSubscriptions: [],
    pollingTimer: null,
  } as PerpsState,

  reducers: {
    setHasPermission(state, payload: boolean) {
      return {
        ...state,
        hasPermission: payload,
      };
    },

    setLocalLoadingHistory(state, payload: AccountHistoryItem[]) {
      return {
        ...state,
        localLoadingHistory: payload,
      };
    },

    setUserAccountHistory(state, payload: AccountHistoryItem[]) {
      return {
        ...state,
        userAccountHistory: payload,
      };
    },

    setUserFills(state, payload: WsFill[]) {
      return {
        ...state,
        userFills: payload,
      };
    },

    addUserFills(
      state,
      payload: { fills: WsFill[]; isSnapshot?: boolean; user: string }
    ) {
      const { fills, isSnapshot } = payload;
      if (isSnapshot) {
        return {
          ...state,
          userFills: fills.slice(0, 2000),
        };
      } else {
        return {
          ...state,
          userFills: [...fills, ...state.userFills],
        };
      }
    },

    updatePositionsWithClearinghouse(state, payload: ClearinghouseState) {
      const openOrders = state.positionAndOpenOrders.flatMap(
        (order) => order.openOrders
      );

      const positionAndOpenOrders = payload.assetPositions
        .filter((position) => position.position.leverage.type === 'isolated')
        .map((position) => {
          return {
            ...position,
            openOrders: openOrders.filter(
              (order) => order.coin === position.position.coin
            ),
          };
        });

      return {
        ...state,
        accountSummary: {
          ...payload.marginSummary,
          withdrawable: payload.withdrawable,
        },
        positionAndOpenOrders,
      };
    },

    updateUserAccountHistory(
      state,
      payload: { newHistoryList: AccountHistoryItem[] }
    ) {
      const { newHistoryList } = payload;
      // 使用当前userAccountHistory过滤 localLoadingHistory
      const filteredLocalHistory = state.localLoadingHistory.filter(
        (item) => !newHistoryList.some((l) => l.hash === item.hash)
      );
      return {
        ...state,
        userAccountHistory: newHistoryList,
        localLoadingHistory: filteredLocalHistory,
      };
    },

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
        userAccountHistory: [],
        localLoadingHistory: [],
        userFills: [],
        perpFee: 0.00045,
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
      rootState.app.wallet.setSendApproveAfterDeposit(
        payload.address,
        payload.approveSignatures
      );
    },

    async fetchPositionAndOpenOrders() {
      const sdk = getPerpsSDK();
      try {
        const [clearinghouseState, openOrders] = await Promise.all([
          sdk.info.getClearingHouseState(),
          sdk.info.getFrontendOpenOrders(),
        ]);

        const positionAndOpenOrders = clearinghouseState.assetPositions
          .filter((position) => position.position.leverage.type === 'isolated')
          .map((position) => {
            return {
              ...position,
              openOrders: openOrders.filter(
                (order) => order.coin === position.position.coin
              ),
            };
          });

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
      await rootState.app.wallet.setPerpsCurrentAccount(payload);
      dispatch.perps.setCurrentPerpsAccount(payload);
      dispatch.perps.refreshData();

      // 订阅实时数据更新
      dispatch.perps.subscribeToUserData(payload.address);

      // 开始轮询获取ClearingHouseState
      dispatch.perps.startPolling(undefined);

      console.log('loginPerpsAccount success', payload.address);
    },

    async fetchClearinghouseState() {
      const sdk = getPerpsSDK();

      const clearinghouseState = await sdk.info.getClearingHouseState();

      dispatch.perps.updatePositionsWithClearinghouse(clearinghouseState);
    },

    async fetchUserNonFundingLedgerUpdates() {
      const sdk = getPerpsSDK();
      const res = await sdk.info.getUserNonFundingLedgerUpdates();

      const list = res
        .filter((item) => {
          if (
            item.delta.type === 'deposit' ||
            item.delta.type === 'withdraw' ||
            item.delta.type === 'accountClassTransfer'
          ) {
            return true;
          }
          return false;
        })
        .map((item) => {
          const type =
            item.delta.type === 'accountClassTransfer'
              ? item.delta.toPerp
                ? 'deposit'
                : 'withdraw'
              : item.delta.type;

          return {
            time: item.time,
            hash: item.hash,
            type: type as 'deposit' | 'withdraw',
            status: 'success' as const,
            usdValue: item.delta.usdc || '0',
          };
        });

      dispatch.perps.updateUserAccountHistory({ newHistoryList: list });

      console.log('fetchUserNonFundingLedgerUpdates', list);
    },

    async refreshData() {
      await dispatch.perps.fetchPositionAndOpenOrders();
      await dispatch.perps.fetchUserNonFundingLedgerUpdates();
    },

    async fetchMarketData(_, rootState) {
      const sdk = getPerpsSDK();

      const fetchTopTokenList = async () => {
        try {
          const topAssets = await rootState.app.wallet.openapi.getPerpTopTokenList();
          return topAssets || DEFAULT_TOP_ASSET;
        } catch (error) {
          console.error('Failed to fetch top assets:', error);
          return DEFAULT_TOP_ASSET;
        }
      };

      const [topAssets, marketData] = await Promise.all([
        fetchTopTokenList(),
        sdk.info.metaAndAssetCtxs(true),
      ]);
      dispatch.perps.setMarketData(formatMarkData(marketData, topAssets));
    },

    async fetchPerpFee() {
      const sdk = getPerpsSDK();
      const res = await sdk.info.getUsersFees();

      const perpFee =
        Number(res.userCrossRate) * (1 - Number(res.activeReferralDiscount));

      const fee = perpFee.toFixed(6);

      dispatch.perps.setPerpFee(Number(fee));
      return Number(fee);
    },

    subscribeToUserData(address, rootState) {
      const sdk = getPerpsSDK();
      const subscriptions: (() => void)[] = [];

      const { unsubscribe: unsubscribeFills } = sdk.ws.subscribeToUserFills(
        (data) => {
          console.log('User fills update:', data);
          const { fills, isSnapshot, user } = data;
          if (user !== address) {
            return;
          }

          dispatch.perps.addUserFills({
            fills,
            isSnapshot: isSnapshot || false,
            user,
          });
        }
      );

      subscriptions.push(unsubscribeFills);

      rootState.perps.wsSubscriptions.push(...subscriptions);
    },

    startPolling(_, rootState) {
      dispatch.perps.stopPolling(undefined);

      const timer = setInterval(() => {
        dispatch.perps.fetchClearinghouseState();
      }, 5000);

      rootState.perps.pollingTimer = timer;
      console.log('开始轮询ClearingHouseState, 间隔5秒');
    },

    stopPolling(_, rootState) {
      if (rootState.perps.pollingTimer) {
        clearInterval(rootState.perps.pollingTimer);
        rootState.perps.pollingTimer = null;
        console.log('停止轮询ClearingHouseState');
      }
    },

    unsubscribeAll(_, rootState) {
      rootState.perps.wsSubscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
      rootState.perps.wsSubscriptions = [];
    },

    logout() {
      dispatch.perps.stopPolling(undefined);
      dispatch.perps.unsubscribeAll(undefined);
      dispatch.perps.resetState();
    },
  }),
});

export default perps;
