import { createModel } from '@rematch/core';
import {
  AssetPosition,
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
    withdrawable: null,
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

    async fetchPositionAndOpenOrders(_address?: string) {
      const sdk = getPerpsSDK();
      try {
        const address = _address || '';
        const [clearinghouseState, openOrders] = await Promise.all([
          sdk.info.getClearingHouseState(address),
          sdk.info.getFrontendOpenOrders(address),
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
      await rootState.app.wallet.setPerpsCurrentAddress(payload.address);
      dispatch.perps.setCurrentPerpsAccount(payload);
      dispatch.perps.refreshData();

      // 订阅实时数据更新
      dispatch.perps.subscribeToUserData(undefined);

      // 开始轮询获取ClearingHouseState
      dispatch.perps.startPolling(undefined);

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
    },

    async fetchUserNonFundingLedgerUpdates(_, rootState) {
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

      dispatch.perps.setUserAccountHistory(list);

      const localLoadingHistory = rootState.perps.localLoadingHistory.filter(
        (item) => !list.some((l) => l.hash === item.hash)
      );
      dispatch.perps.setLocalLoadingHistory(localLoadingHistory);

      console.log('fetchUserNonFundingLedgerUpdates', list);
      console.log(
        'fetchUserNonFundingLedgerUpdates localLoadingHistory',
        localLoadingHistory
      );
    },

    async refreshData() {
      await dispatch.perps.fetchPositionAndOpenOrders(undefined);
      await dispatch.perps.fetchUserNonFundingLedgerUpdates(undefined);
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

      const fee = perpFee.toFixed(6);

      dispatch.perps.setPerpFee(Number(fee));
      return Number(fee);
    },

    subscribeToUserData(_, rootState) {
      const sdk = getPerpsSDK();
      const subscriptions: (() => void)[] = [];

      // 订阅用户成交记录
      const { unsubscribe: unsubscribeFills } = sdk.ws.subscribeToUserFills(
        (data) => {
          console.log('User fills update:', data);
          const { fills, isSnapshot, user } = data;
          if (user !== rootState.perps.currentPerpsAccount?.address) {
            return;
          }

          if (isSnapshot) {
            dispatch.perps.setUserFills(fills.slice(0, 2000));
          } else {
            dispatch.perps.setUserFills([
              ...rootState.perps.userFills,
              ...fills,
            ]);
          }
        }
      );

      // 订阅用户订单更新 no use , set auto close isn't update this callback
      // const { unsubscribe: unsubscribeOrders } = sdk.ws.subscribeToUserOrders(
      //   (orders) => {
      //     console.log('User orders update:', orders);
      //     // 订单状态变化时自动刷新数据
      //     // dispatch.perps.refreshData();
      //     // const positionAndOpenOrders = rootState.perps.positionAndOpenOrders.map(
      //     //   (position) => {
      //     //     if (
      //     //       orders.some((order) => order.coin === position.position.coin)
      //     //     ) {
      //     //       const openOrders = position.openOrders;
      //     //       return {
      //     //         ...position,
      //     //         openOrders: orders.filter(
      //     //           (order) => order.coin === position.position.coin
      //     //         ),
      //     //       };
      //     //     }
      //     //   }
      //     // );
      //     // dispatch.perps.setPositionAndOpenOrders(positionAndOpenOrders);
      //   }
      // );

      subscriptions.push(unsubscribeFills);

      // 保存取消订阅的函数
      rootState.perps.wsSubscriptions.push(...subscriptions);
    },

    startPolling(_, rootState) {
      dispatch.perps.stopPolling(undefined);

      const timer = setInterval(() => {
        dispatch.perps.fetchClearinghouseState(undefined);
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
      destroyPerpsSDK();
      dispatch.perps.stopPolling(undefined);
      dispatch.perps.unsubscribeAll(undefined);
      dispatch.perps.resetState();
    },
  }),
});

export default perps;
