import { createModel } from '@rematch/core';
import {
  AssetCtx,
  AssetPosition,
  ClearinghouseState,
  InfoClient,
  MarginSummary,
  OpenOrder,
  UserFill,
  UserFunding,
  UserHistoricalOrders,
  WsActiveAssetCtx,
  WsActiveAssetData,
  WsFill,
  WsUserFills,
  wsUserNonFundingLedgerUpdates,
  WsUserFunding,
  UserNonFundingLedgerUpdates,
  WsTwapStates,
  UserTwapHistory,
  UserTwapSliceFill,
} from '@rabby-wallet/hyperliquid-sdk';
import { Account } from '@/background/service/preference';
import { RootModel } from '.';
import { destroyPerpsSDK, getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import {
  formatMarkData,
  getMaxTimeFromAccountHistory,
} from '../views/Perps/utils';
import { DEFAULT_TOP_ASSET } from '../views/Perps/constants';
import { ApproveSignatures } from '@/background/service/perps';
import { maxBy } from 'lodash';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { isSameAddress } from '../utils';
import {
  handleUpdateHistoricalOrders,
  handleUpdateTwapSliceFills,
} from '../views/DesktopPerps/utils';

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
  positionAndOpenOrders: PositionAndOpenOrder[];
  accountSummary: AccountSummary | null;
  currentPerpsAccount: Account | null;
  accountNeedApproveAgent: boolean; // 账户是否需要重新approve agent
  accountNeedApproveBuilderFee: boolean; // 账户是否需要重新approve builder fee
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
  // Desktop Pro fields
  selectedCoin: string;
  favoritedCoins: string[];
  chartInterval: string;
  wsActiveAssetCtx: WsActiveAssetCtx | null;
  wsActiveAssetData: WsActiveAssetData | null;
  clearinghouseState: ClearinghouseState | null;
  openOrders: OpenOrder[];
  clearinghouseStateMap: Record<string, ClearinghouseState | null>;
  historicalOrders: UserHistoricalOrders[];
  userFunding: WsUserFunding['fundings'];
  nonFundingLedgerUpdates: UserNonFundingLedgerUpdates[];
  twapStates: WsTwapStates['states'];
  twapHistory: UserTwapHistory[];
  twapSliceFills: UserTwapSliceFill[];
  marketSlippage: number; // 0-1, default 0.08 (8%)
}

export const perps = createModel<RootModel>()({
  state: {
    // clearinghouseState: null,
    positionAndOpenOrders: [],
    accountSummary: null,
    hasPermission: true,
    perpFee: 0.00045,
    currentPerpsAccount: null,
    accountNeedApproveAgent: false,
    accountNeedApproveBuilderFee: false,
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
    // Desktop Pro fields
    selectedCoin: 'BTC',
    favoritedCoins: [],
    chartInterval: '15m',
    wsActiveAssetCtx: null,
    wsActiveAssetData: null,
    clearinghouseState: null,
    clearinghouseStateMap: {},
    openOrders: [],
    historicalOrders: [],
    userFunding: [],
    nonFundingLedgerUpdates: [],
    twapStates: [],
    twapHistory: [],
    twapSliceFills: [],
    marketSlippage: 0.08, // default 8%
  } as PerpsState,

  reducers: {
    patchState(state, payload: Partial<PerpsState>) {
      return {
        ...state,
        ...payload,
      };
    },

    patchStatsListBySnapshot(
      state,
      payload: {
        listName:
          | 'twapSliceFills'
          | 'twapHistory'
          | 'userFunding'
          | 'historicalOrders'
          // | 'nonFundingLedgerUpdates'
          | 'userFills';
        list:
          | UserTwapSliceFill[]
          | UserTwapHistory[]
          | WsUserFunding['fundings']
          | UserHistoricalOrders[]
          // | UserNonFundingLedgerUpdates[]
          | WsFill[];
        isSnapshot: boolean;
      }
    ) {
      const { listName, list, isSnapshot } = payload;
      if (isSnapshot) {
        return {
          ...state,
          [listName]: list.reverse().slice(0, 2000),
        };
      } else {
        return {
          ...state,
          [listName]: [...list, ...state[listName]],
        };
      }
    },

    setUserNonFundingLedgerUpdates(
      state,
      payload: { list: UserNonFundingLedgerUpdates[]; isSnapshot?: boolean }
    ) {
      const { list, isSnapshot } = payload;

      const newList = list
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
            const fee = (item.delta as any).fee as string;
            const realUsdValue = Number(item.delta.usdc) - Number(fee || '0');
            return {
              time: item.time,
              hash: item.hash,
              type: 'receive' as const,
              status: 'success' as const,
              usdValue: realUsdValue.toString(),
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

      if (isSnapshot) {
        return {
          ...state,
          userAccountHistory: newList.reverse().slice(0, 2000),
        };
      } else {
        const {
          depositMaxTime,
          withdrawMaxTime,
          receiveMaxTime,
        } = getMaxTimeFromAccountHistory(newList);

        const filteredLocalHistory = state.localLoadingHistory.filter(
          (item) => {
            if (item.type === 'deposit') {
              return item.time >= depositMaxTime;
            } else if (item.type === 'withdraw') {
              return item.time >= withdrawMaxTime;
            } else {
              return item.time >= receiveMaxTime;
            }
          }
        );

        return {
          ...state,
          localLoadingHistory: filteredLocalHistory,
          userAccountHistory: [...newList, ...state.userAccountHistory],
        };
      }
    },

    setClearinghouseStateMap(
      state,
      payload: Record<string, ClearinghouseState | null>
    ) {
      return {
        ...state,
        clearinghouseStateMap: {
          ...state.clearinghouseStateMap,
          ...payload,
        },
      };
    },

    patchClearinghouseState(state, payload: ClearinghouseState) {
      const currentStateTime = state.clearinghouseState?.time || 0;
      if (payload.time <= currentStateTime) {
        return state;
      }
      return {
        ...state,
        clearinghouseState: payload,
      };
    },

    setCurrentBestAskPrice(state, payload: string) {
      return {
        ...state,
        currentBestAskPrice: payload,
      };
    },

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

    clearLocalLoadingHistory(state) {
      return {
        ...state,
        localLoadingHistory: [],
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
      const {
        depositMaxTime,
        withdrawMaxTime,
        receiveMaxTime,
      } = getMaxTimeFromAccountHistory(newHistoryList);
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
      if (payload.length === 0 || state.marketData.length === 0) {
        return {
          ...state,
        };
      }

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
      console.log('setInitialized', payload);
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

    setAccountNeedApproveAgent(state, payload: boolean) {
      return {
        ...state,
        accountNeedApproveAgent: payload,
      };
    },

    setAccountNeedApproveBuilderFee(state, payload: boolean) {
      return {
        ...state,
        accountNeedApproveBuilderFee: payload,
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
        accountNeedApproveAgent: false,
        accountNeedApproveBuilderFee: false,
      };
    },

    // Desktop Pro reducers
    setSelectedCoin(state, payload: string) {
      return {
        ...state,
        selectedCoin: payload,
      };
    },

    setFavoritedCoins(state, payload: string[]) {
      return {
        ...state,
        favoritedCoins: payload,
      };
    },

    addFavoritedCoin(state, payload: string) {
      if (state.favoritedCoins.includes(payload)) {
        return state;
      }
      return {
        ...state,
        favoritedCoins: [...state.favoritedCoins, payload],
      };
    },

    removeFavoritedCoin(state, payload: string) {
      return {
        ...state,
        favoritedCoins: state.favoritedCoins.filter((coin) => coin !== payload),
      };
    },

    setChartInterval(state, payload: string) {
      return {
        ...state,
        chartInterval: payload,
      };
    },

    setWsActiveAssetCtx(state, payload: WsActiveAssetCtx | null) {
      return {
        ...state,
        wsActiveAssetCtx: payload,
      };
    },

    setWsActiveAssetData(state, payload: WsActiveAssetData | null) {
      return {
        ...state,
        wsActiveAssetData: payload,
      };
    },

    setMarketSlippage(state, payload: number) {
      return {
        ...state,
        marketSlippage: Math.max(0, Math.min(1, payload)),
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

        console.log('clearinghouseState', clearinghouseState);
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

    async loginPerpsAccount(
      payload: {
        account: Account;
        isPro: boolean;
      },
      rootState
    ) {
      const { account, isPro } = payload;
      await rootState.app.wallet.setPerpsCurrentAccount(account);
      dispatch.perps.setCurrentPerpsAccount(account);
      // await dispatch.perps.refreshData();
      if (isPro) {
        await dispatch.perps.fetchClearinghouseState();
        // other use subscribe to data
      } else {
        await dispatch.perps.fetchPositionAndOpenOrders();
        dispatch.perps.fetchUserNonFundingLedgerUpdates();
        dispatch.perps.fetchUserHistoricalOrders();
      }

      // 订阅实时数据更新
      dispatch.perps.subscribeToUserData({ address: account.address, isPro });

      // dispatch.perps.startPolling(undefined);

      dispatch.perps.fetchPerpPermission(account.address);
      setTimeout(() => {
        // avoid 429 error
        dispatch.perps.fetchPerpFee();
      }, 1000);
      console.log('loginPerpsAccount success', account.address);
    },

    async fetchClearinghouseState() {
      const sdk = getPerpsSDK();

      const clearinghouseState = await sdk.info.getClearingHouseState();

      dispatch.perps.updatePositionsWithClearinghouse(clearinghouseState);

      dispatch.perps.patchClearinghouseState(clearinghouseState);
    },

    async fetchPositionOpenOrders() {
      const sdk = getPerpsSDK();
      const openOrders = await sdk.info.getFrontendOpenOrders();
      dispatch.perps.updateOpenOrders(openOrders);
      dispatch.perps.patchState({ openOrders });
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
            const fee = (item.delta as any).fee as string;
            const realUsdValue = Number(item.delta.usdc) - Number(fee || '0');
            return {
              time: item.time,
              hash: item.hash,
              type: 'receive' as const,
              status: 'success' as const,
              usdValue: realUsdValue.toString(),
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

        dispatch.perps.patchState({ historicalOrders: res });
        dispatch.perps.setFillsOrderTpOrSl(listOrderTpOrSl);
      } catch (error) {
        console.error('Failed to fetch user historical orders:', error);
      }
    },

    // async fetchUserFunding() {
    //   try {
    //     const sdk = getPerpsSDK();
    //     const res = await sdk.info.getUserFunding();

    //     dispatch.perps.patchState({ userFunding: res });
    //   } catch (error) {
    //     console.error('Failed to fetch user historical orders:', error);
    //   }
    // },

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

    subscribeToUserData(
      payload: { address: string; isPro: boolean },
      rootState
    ) {
      const { address, isPro } = payload;
      const sdk = getPerpsSDK();
      const subscriptions: (() => void)[] = [];
      dispatch.perps.unsubscribeAll(undefined);
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
      subscriptions.push(unsubscribeWebData2);

      if (isPro) {
        const {
          unsubscribe: unsubscribeClearinghouseState,
        } = sdk.ws.subscribeToClearinghouseState(address, (data) => {
          const { clearinghouseState, user } = data;
          if (!isSameAddress(user, address)) {
            return;
          }
          dispatch.perps.patchClearinghouseState(clearinghouseState);
          dispatch.perps.setClearinghouseStateMap({
            [address.toLowerCase()]: clearinghouseState,
          });
        });
        subscriptions.push(unsubscribeClearinghouseState);

        const {
          unsubscribe: unsubscribeOpenOrders,
        } = sdk.ws.subscribeToOpenOrders((data) => {
          const { orders, user } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          dispatch.perps.patchState({ openOrders: orders || [] });
        });
        subscriptions.push(unsubscribeOpenOrders);

        const {
          unsubscribe: unsubscribeUserFunding,
        } = sdk.ws.subscribeToUserFunding((data) => {
          const { fundings, user, isSnapshot } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          dispatch.perps.patchStatsListBySnapshot({
            listName: 'userFunding',
            list: fundings,
            isSnapshot: isSnapshot || false,
          });
        });
        subscriptions.push(unsubscribeUserFunding);

        const {
          unsubscribe: unsubscribeUserHistoricalOrders,
        } = sdk.ws.subscribeToUserHistoricalOrders((data) => {
          const { orderHistory, user, isSnapshot } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          if (!isSnapshot) {
            handleUpdateHistoricalOrders(orderHistory);
          }

          dispatch.perps.patchStatsListBySnapshot({
            listName: 'historicalOrders',
            list: orderHistory,
            isSnapshot: isSnapshot || false,
          });
        });
        subscriptions.push(unsubscribeUserHistoricalOrders);

        const {
          unsubscribe: unsubscribeUserNonFundingLedgerUpdates,
        } = sdk.ws.subscribeToUserNonFundingLedgerUpdates((data) => {
          const { nonFundingLedgerUpdates, user, isSnapshot } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          dispatch.perps.setUserNonFundingLedgerUpdates({
            list: nonFundingLedgerUpdates,
            isSnapshot: isSnapshot || false,
          });
        });
        subscriptions.push(unsubscribeUserNonFundingLedgerUpdates);

        const {
          unsubscribe: unsubscribeTwapStates,
        } = sdk.ws.subscribeToTwapStates((data) => {
          const { states, user } = data;
          if (!isSameAddress(user, address)) {
            return;
          }
          dispatch.perps.patchState({ twapStates: states });
        });
        subscriptions.push(unsubscribeTwapStates);

        const {
          unsubscribe: unsubscribeUserTwapHistory,
        } = sdk.ws.subscribeToUserTwapHistory((data) => {
          const { history, user, isSnapshot } = data;
          if (!isSameAddress(user, address)) {
            return;
          }
          dispatch.perps.patchStatsListBySnapshot({
            listName: 'twapHistory',
            list: history,
            isSnapshot: isSnapshot || false,
          });
        });
        subscriptions.push(unsubscribeUserTwapHistory);

        const {
          unsubscribe: unsubscribeUserTwapSliceFills,
        } = sdk.ws.subscribeToUserTwapSliceFills((data) => {
          const { twapSliceFills, user, isSnapshot } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          if (!isSnapshot) {
            handleUpdateTwapSliceFills(twapSliceFills);
          }

          dispatch.perps.patchStatsListBySnapshot({
            listName: 'twapSliceFills',
            list: twapSliceFills,
            isSnapshot: isSnapshot || false,
          });
        });
        subscriptions.push(unsubscribeUserTwapSliceFills);
      }

      const { unsubscribe: unsubscribeFills } = sdk.ws.subscribeToUserFills(
        (data) => {
          console.log('User fills update:', data);
          const { fills, isSnapshot, user } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          dispatch.perps.patchStatsListBySnapshot({
            listName: 'userFills',
            list: fills,
            isSnapshot: isSnapshot || false,
          });
        }
      );
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
        try {
          unsubscribe();
        } catch (e) {
          console.error('unsubscribe error', e);
        }
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

    // Desktop Pro effects
    async initFavoritedCoins(_, rootState) {
      try {
        const favoritedCoins = await rootState.app.wallet.getPerpsFavoritedCoins();
        if (favoritedCoins && favoritedCoins.length > 0) {
          dispatch.perps.setFavoritedCoins(favoritedCoins);
        } else {
          // Default favorited coins
          dispatch.perps.setFavoritedCoins(['BTC', 'ETH', 'SOL']);
        }
      } catch (error) {
        console.error('Failed to load favorited coins:', error);
        // Fallback to default
        dispatch.perps.setFavoritedCoins(['BTC', 'ETH', 'SOL']);
      }
    },

    async toggleFavoriteCoin(coin: string, rootState) {
      try {
        const { favoritedCoins } = rootState.perps;

        let newFavoritedCoins: string[];
        if (favoritedCoins.includes(coin)) {
          dispatch.perps.removeFavoritedCoin(coin);
          newFavoritedCoins = favoritedCoins.filter((c) => c !== coin);
        } else {
          dispatch.perps.addFavoritedCoin(coin);
          newFavoritedCoins = [...favoritedCoins, coin];
        }

        // Save to storage
        await rootState.app.wallet.setPerpsFavoritedCoins(newFavoritedCoins);
      } catch (error) {
        console.error('Failed to toggle favorite coin:', error);
      }
    },

    async initMarketSlippage(_, rootState) {
      try {
        const slippage = await rootState.app.wallet.getMarketSlippage();
        dispatch.perps.setMarketSlippage(slippage ?? 0.08);
      } catch (error) {
        console.error('Failed to load market slippage:', error);
        dispatch.perps.setMarketSlippage(0.08);
      }
    },

    async updateMarketSlippage(slippage: number, rootState) {
      try {
        const clampedSlippage = Math.max(0, Math.min(1, slippage));
        dispatch.perps.setMarketSlippage(clampedSlippage);
        await rootState.app.wallet.setMarketSlippage(clampedSlippage);
      } catch (error) {
        console.error('Failed to save market slippage:', error);
      }
    },
  }),
});

export default perps;
