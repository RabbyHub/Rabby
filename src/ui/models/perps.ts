import { createModel } from '@rematch/core';
import {
  AssetCtx,
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
import { maxBy } from 'lodash';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { isSameAddress } from '../utils';

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
  type: 'deposit' | 'withdraw' | 'receive';
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
  fillsOrderTpOrSl: Record<string, 'tp' | 'sl'>;
  homePositionPnl: {
    pnl: number;
    show: boolean;
  };
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
    homePositionPnl: {
      pnl: 0,
      show: false,
    },
    fillsOrderTpOrSl: {},
  } as PerpsState,

  reducers: {
    setFillsOrderTpOrSl(state, payload: Record<string, 'tp' | 'sl'>) {
      return {
        ...state,
        fillsOrderTpOrSl: payload,
      };
    },

    setHomePositionPnl(state, payload: { pnl: number; show: boolean }) {
      return {
        ...state,
        homePositionPnl: payload,
      };
    },

    setHasPermission(state, payload: boolean) {
      return {
        ...state,
        hasPermission: payload,
      };
    },

    setLocalLoadingHistory(state, payload: AccountHistoryItem[]) {
      return {
        ...state,
        localLoadingHistory: [...payload, ...state.localLoadingHistory],
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

      const positionAndOpenOrders = payload.assetPositions.map((position) => {
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
        homePositionPnl: {
          pnl: payload.assetPositions.reduce((acc, asset) => {
            return acc + Number(asset.position.unrealizedPnl);
          }, 0),
          show: payload.assetPositions.length > 0,
        },
      };
    },

    updateUserAccountHistory(
      state,
      payload: { newHistoryList: AccountHistoryItem[] }
    ) {
      if (payload.newHistoryList.length === 0) {
        return state;
      }
      const { newHistoryList } = payload;
      const depositList = newHistoryList.filter(
        (item) => item.type === 'deposit'
      );
      const withdrawList = newHistoryList.filter(
        (item) => item.type === 'withdraw'
      );
      const receiveList = newHistoryList.filter(
        (item) => item.type === 'receive'
      );
      const receiveMaxTime = maxBy(receiveList, 'time')?.time || 0;
      const depositMaxTime = maxBy(depositList, 'time')?.time || 0;
      const withdrawMaxTime = maxBy(withdrawList, 'time')?.time || 0;
      // 使用当前userAccountHistory过滤 localLoadingHistory
      const filteredLocalHistory = state.localLoadingHistory.filter((item) => {
        if (item.type === 'deposit') {
          return item.time >= depositMaxTime;
        } else if (item.type === 'withdraw') {
          return item.time >= withdrawMaxTime;
        } else {
          return item.time >= receiveMaxTime;
        }
      });
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
        marketDataMap: buildMarketDataMap(list),
      };
    },

    updateMarketData(state, payload: AssetCtx[]) {
      const list = payload || [];
      const newMarketData = state.marketData.map((item) => {
        return {
          ...item,
          ...list[item.index],
        };
      });
      return {
        ...state,
        marketData: newMarketData,
        marketDataMap: buildMarketDataMap(newMarketData),
      };
    },

    setPositionAndOpenOrders(
      state,
      clearinghouseState: ClearinghouseState,
      openOrders: OpenOrder[]
    ) {
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
      return {
        ...state,
        accountSummary: {
          ...clearinghouseState.marginSummary,
          withdrawable: clearinghouseState.withdrawable,
        },
        positionAndOpenOrders,
        homePositionPnl: {
          pnl: positionAndOpenOrders.reduce((acc, order) => {
            return acc + Number(order.position.unrealizedPnl);
          }, 0),
          show: positionAndOpenOrders.length > 0,
        },
      };
    },

    updateOpenOrders(state, payload: OpenOrder[]) {
      const positionAndOpenOrders = state.positionAndOpenOrders.map((order) => {
        return {
          ...order,
          openOrders: payload.filter(
            (item) => item.coin === order.position.coin
          ),
        };
      });
      return {
        ...state,
        positionAndOpenOrders,
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
        fillsOrderTpOrSl: {},
        hasPermission: true,
        homePositionPnl: {
          pnl: 0,
          show: false,
        },
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

        dispatch.perps.setPositionAndOpenOrders(clearinghouseState, openOrders);

        dispatch.perps.setAccountSummary({
          ...clearinghouseState.marginSummary,
          withdrawable: clearinghouseState.withdrawable,
        });
      } catch (error: any) {
        console.error('Failed to fetch clearinghouse state:', error);
      }
    },

    async fetchPerpPermission(address: string, rootState) {
      const {
        has_permission,
      } = await rootState.app.wallet.openapi.getPerpPermission({ id: address });
      dispatch.perps.setHasPermission(has_permission);
    },

    async loginPerpsAccount(payload: Account, rootState) {
      await rootState.app.wallet.setPerpsCurrentAccount(payload);
      dispatch.perps.setCurrentPerpsAccount(payload);
      await dispatch.perps.refreshData();

      // 订阅实时数据更新
      dispatch.perps.subscribeToUserData(payload.address);

      // dispatch.perps.startPolling(undefined);

      dispatch.perps.fetchPerpPermission(payload.address);
      setTimeout(() => {
        // avoid 429 error
        dispatch.perps.fetchPerpFee();
      }, 1000);
      console.log('loginPerpsAccount success', payload.address);
    },

    async fetchClearinghouseState() {
      const sdk = getPerpsSDK();

      const clearinghouseState = await sdk.info.getClearingHouseState();

      dispatch.perps.updatePositionsWithClearinghouse(clearinghouseState);
    },

    async fetchPositionOpenOrders() {
      const sdk = getPerpsSDK();
      const openOrders = await sdk.info.getFrontendOpenOrders();
      dispatch.perps.updateOpenOrders(openOrders);
    },

    async fetchUserNonFundingLedgerUpdates() {
      const sdk = getPerpsSDK();
      const res = await sdk.info.getUserNonFundingLedgerUpdates();

      const list = res
        .filter((item) => {
          if (
            item.delta.type === 'deposit' ||
            item.delta.type === 'withdraw' ||
            item.delta.type === 'internalTransfer' ||
            item.delta.type === 'accountClassTransfer'
          ) {
            return true;
          }
          return false;
        })
        .map((item) => {
          if (item.delta.type === 'internalTransfer') {
            return {
              time: item.time,
              hash: item.hash,
              type: 'receive' as const,
              status: 'success' as const,
              usdValue: item.delta.usdc || '0',
            };
          }

          const type =
            item.delta.type === 'accountClassTransfer'
              ? item.delta.toPerp
                ? 'deposit'
                : 'withdraw'
              : item.delta.type;

          return {
            time: item.time,
            hash: item.hash,
            type: type as 'deposit' | 'withdraw' | 'receive',
            status: 'success' as const,
            usdValue: item.delta.usdc || '0',
          };
        });

      dispatch.perps.updateUserAccountHistory({ newHistoryList: list });

      console.log('fetchUserNonFundingLedgerUpdates', list);
    },

    async fetchUserHistoricalOrders() {
      try {
        const sdk = getPerpsSDK();
        const res = await sdk.info.getUserHistoricalOrders(
          undefined, // use sdk inner address
          Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
          0
        );
        const listOrderTpOrSl = {} as Record<string, 'tp' | 'sl'>;
        res.forEach((item) => {
          if (item.status !== 'triggered') {
            return null;
          }
          if (item.order.reduceOnly && item.order.isTrigger) {
            if (
              item.order.orderType === 'Take Profit Market' ||
              item.order.orderType === 'Stop Market'
            ) {
              listOrderTpOrSl[item.order.oid] =
                item.order.orderType === 'Stop Market' ? 'sl' : 'tp';
            }
          }
        });

        dispatch.perps.setFillsOrderTpOrSl(listOrderTpOrSl);
      } catch (error) {
        console.error('Failed to fetch user historical orders:', error);
      }
    },

    async refreshData() {
      await dispatch.perps.fetchPositionAndOpenOrders();
      dispatch.perps.fetchUserNonFundingLedgerUpdates();
      dispatch.perps.fetchUserHistoricalOrders();
    },

    async fetchMarketData(_, rootState) {
      const sdk = getPerpsSDK();

      const fetchTopTokenList = async () => {
        try {
          const topAssets = await rootState.app.wallet.openapi.getPerpTopTokenList();
          if (topAssets.length > 0) {
            return topAssets;
          } else {
            return DEFAULT_TOP_ASSET;
          }
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

      const { unsubscribe: unsubscribeWebData2 } = sdk.ws.subscribeToWebData2(
        (data) => {
          const {
            clearinghouseState,
            assetCtxs,
            openOrders,
            serverTime,
            user,
          } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          dispatch.perps.setPositionAndOpenOrders(
            clearinghouseState,
            openOrders
          );

          dispatch.perps.updateMarketData(assetCtxs);
        }
      );

      const { unsubscribe: unsubscribeFills } = sdk.ws.subscribeToUserFills(
        (data) => {
          console.log('User fills update:', data);
          const { fills, isSnapshot, user } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          dispatch.perps.addUserFills({
            fills,
            isSnapshot: isSnapshot || false,
            user,
          });
        }
      );
      subscriptions.push(unsubscribeWebData2);
      subscriptions.push(unsubscribeFills);

      rootState.perps.wsSubscriptions.push(...subscriptions);
    },

    // startPolling(_, rootState) {
    //   dispatch.perps.stopPolling(undefined);

    //   const timer = setInterval(() => {
    //     dispatch.perps.fetchClearinghouseState();
    //   }, 30 * 1000);

    //   rootState.perps.pollingTimer = timer;
    //   console.log('开始轮询ClearingHouseState, 间隔5秒');
    // },

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

    initEventBus() {
      eventBus.addEventListener(EVENTS.PERPS.LOG_OUT, () => {
        dispatch.perps.logout();
      });
    },
  }),
});

export default perps;
