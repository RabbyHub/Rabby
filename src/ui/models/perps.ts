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
  WsAllClearinghouseStates,
  SpotClearinghouseState,
  UserAbstractionResp,
} from '@rabby-wallet/hyperliquid-sdk';
import { Account } from '@/background/service/preference';
import { RootModel, RabbyRootState } from '.';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { formatMarkData, getPxDecimals } from '../views/Perps/utils';
import {
  DEFAULT_TOP_ASSET,
  DEFAULT_ASSET_CATEGORY,
  HYPE_EVM_BRIDGE_ADDRESS_MAP,
  PerpsQuoteAsset,
  CANDLE_MENU_KEY_V2,
} from '../views/Perps/constants';
import { ApproveSignatures } from '@/background/service/perps';
import { maxBy } from 'lodash';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { isSameAddress } from '../utils';
import store from '@/ui/store';
import {
  formatAllDexsClearinghouseState,
  AggregatedClearinghouseState,
  handleUpdateHistoricalOrders,
  handleUpdateTwapSliceFills,
  showDepositAndWithdrawToast,
  formatSpotState,
  SpotBalance,
  getCachedPerpDexs,
} from '../views/DesktopPerps/utils';
import {
  OrderType,
  OrderSide,
  PositionSize,
  TPSLConfig,
  SizeDisplayUnit,
} from '../views/DesktopPerps/types';
import {
  PerpTopTokenV3,
  PerpTopTokenCategory,
} from '@rabby-wallet/rabby-api/dist/types';
import stats from '@/stats';
import BigNumber from 'bignumber.js';

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
  displayName: string;
  quoteAsset: PerpsQuoteAsset;
  category?: string;
  brief?: string;
  description?: string;
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
  dexId: string;
  onlyIsolated?: boolean;
}

export type MarketDataMap = Record<string, MarketData>;

const buildMarketDataMap = (list: MarketData[]): MarketDataMap => {
  return list.reduce((acc, item) => {
    acc[item.name] = item;
    return acc;
  }, {} as MarketDataMap);
};

export interface AccountHistoryItem {
  time: number;
  hash: string;
  type: 'deposit' | 'withdraw' | 'receive' | 'transfer';
  destinationDex?: string; // only for transfer type, indicate the destination dex of the transfer
  status: 'pending' | 'success' | 'failed';
  usdValue: string;
}

const VALID_TPSL_MODES = ['price', 'pnl', 'roi'] as const;

const getSavedTpslMode = (
  type: 'takeProfit' | 'stopLoss'
): 'price' | 'pnl' | 'roi' => {
  try {
    const val = localStorage.getItem(`perps_tpsl_mode_${type}`);
    if (val && (VALID_TPSL_MODES as readonly string[]).includes(val)) {
      return val as 'price' | 'pnl' | 'roi';
    }
  } catch (e) {
    // ignore
  }
  return 'price';
};

export const DEFAULT_TPSL_CONFIG: TPSLConfig = {
  enabled: false,
  takeProfit: {
    settingMode: 'price',
    value: '',
    error: '',
    buyTriggerPrice: '',
    sellTriggerPrice: '',
    estimatedPnl: '',
    estimatedPnlPercent: '',
  },
  stopLoss: {
    settingMode: 'price',
    value: '',
    error: '',
    buyTriggerPrice: '',
    sellTriggerPrice: '',
    estimatedPnl: '',
    estimatedPnlPercent: '',
  },
};

const getInitTradingState = () => ({
  tradingPositionSize: { amount: '', notionalValue: '' },
  tradingPercentage: 0,
  tradingReduceOnly: false,
  tradingTpslConfig: {
    ...DEFAULT_TPSL_CONFIG,
    takeProfit: {
      ...DEFAULT_TPSL_CONFIG.takeProfit,
      settingMode: getSavedTpslMode('takeProfit'),
    },
    stopLoss: {
      ...DEFAULT_TPSL_CONFIG.stopLoss,
      settingMode: getSavedTpslMode('stopLoss'),
    },
  },
  bboPrices: { asks1: '', asks5: '', bids1: '', bids5: '' },
});

export interface PerpsState {
  // positionAndOpenOrders: PositionAndOpenOrder[];
  accountSummary: AccountSummary | null;
  currentPerpsAccount: Account | null;
  accountNeedApproveAgent: boolean; // 账户是否需要重新approve agent
  accountNeedApproveBuilderFee: boolean; // 账户是否需要重新approve builder fee
  marketData: MarketData[];
  marketDataMap: MarketDataMap;
  marketDataCategories: PerpTopTokenCategory[];
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
  // Desktop Pro fields
  selectedCoin: string;
  selectedTokenDetail: PerpTopTokenV3 | null;
  favoritedCoins: string[];
  marginModePreferences: Record<string, 'cross' | 'isolated'>;
  chartInterval: string;
  wsActiveAssetCtx: WsActiveAssetCtx | null;
  wsActiveAssetData: WsActiveAssetData | null;
  clearinghouseState: AggregatedClearinghouseState | null;
  openOrders: OpenOrder[];
  clearinghouseStateMap: Record<string, ClearinghouseState | null>;
  spotState: {
    accountValue: string;
    availableToTrade: string;
    balances: SpotBalance[];
    balancesMap: Record<string, SpotBalance>;
    tokenToAvailableAfterMaintenance: [number, string][] | null;
  };
  userAbstraction: UserAbstractionResp;
  historicalOrders: UserHistoricalOrders[];
  userFunding: WsUserFunding['fundings'];
  nonFundingLedgerUpdates: UserNonFundingLedgerUpdates[];
  twapStates: WsTwapStates['states'];
  twapHistory: UserTwapHistory[];
  twapSliceFills: UserTwapSliceFill[];
  marketSlippage: number; // 0-1, default 0.05 (5%)
  soundEnabled: boolean;
  skipMarketCloseConfirm: boolean;
  // Persisted candle interval for the popup chart ([CANDLE_MENU_KEY_V2]).
  // Persistence is handled via perpsService — see initCandleInterval /
  // updateCandleInterval effects.
  candleInterval: CANDLE_MENU_KEY_V2;
  marketEstSize: string;
  marketEstPrice: string;
  quoteUnit: 'base' | 'usd';
  // Trading panel state (preserved across orderType switches)
  // tradingOrderType: OrderType;
  sizeDisplayUnit: SizeDisplayUnit;
  /** @deprecated Will be removed - direction is now determined by button click */
  tradingOrderSide: 'buy' | 'sell';
  tradingPositionSize: PositionSize;
  tradingTpslConfig: TPSLConfig;
  tradingPercentage: number;
  tradingReduceOnly: boolean;
  // BBO prices from orderbook (default aggregation level)
  bboPrices: {
    asks1: string; // asks[0] — best ask
    asks5: string; // asks[4] — 5th ask
    bids1: string; // bids[0] — best bid
    bids5: string; // bids[4] — 5th bid
  };
}

let topAssetsCache: PerpTopTokenV3[] = [];
let perpsCategoryCache: PerpTopTokenCategory[] = [];

// Latest per-dex AssetCtx snapshot pushed by WS. WS frames are full-dex
// snapshots, so the latest one is authoritative. Stored at module scope so
// `setMarketData` (HTTP path, ticker fields are empty after `formatMarkData`)
// can backfill any ticker data that arrived during the fetch window —
// otherwise prices/funding/volume would briefly flash to empty until the next
// WS tick.
let lastCtxsByDex: Record<string, AssetCtx[]> = {};

let marketDataInFlight: Promise<void> | null = null;

const buildCtxsByDex = (
  payload: [string, AssetCtx[]][]
): Record<string, AssetCtx[]> => {
  const map: Record<string, AssetCtx[]> = {};
  payload.forEach(([dexId, ctxs]) => {
    const dexName = dexId ? dexId : 'hyperliquid';
    map[dexName] = ctxs;
  });
  return map;
};

const applyAssetCtxsToList = (
  list: MarketData[],
  ctxsByDex: Record<string, AssetCtx[]>
): MarketData[] => {
  return list.map((item) => {
    const dexName = item.dexId ? item.dexId : 'hyperliquid';
    const ctx = ctxsByDex[dexName]?.[item.index];
    if (!ctx) return item;
    return {
      ...item,
      ...ctx,
      pxDecimals: getPxDecimals(String(ctx.markPx ?? item.markPx ?? '')),
    };
  });
};

export const perps = createModel<RootModel>()({
  state: {
    // clearinghouseState: null,
    // positionAndOpenOrders: [],
    accountSummary: null,
    hasPermission: true,
    perpFee: 0.00045,
    currentPerpsAccount: null,
    accountNeedApproveAgent: false,
    accountNeedApproveBuilderFee: false,
    marketData: [],
    marketDataCategories: [],
    userAccountHistory: [],
    localLoadingHistory: [],
    marketDataMap: {},
    isLogin: false,
    isInitialized: false,
    userFills: [],
    approveSignatures: [],
    wsSubscriptions: [],
    pollingTimer: null,
    fillsOrderTpOrSl: {},
    // Desktop Pro fields
    selectedCoin: 'BTC',
    favoritedCoins: [],
    marginModePreferences: {},
    chartInterval: '15m',
    wsActiveAssetCtx: null,
    wsActiveAssetData: null,
    clearinghouseState: null,
    clearinghouseStateMap: {},
    openOrders: [],
    historicalOrders: [],
    userAbstraction: 'default',
    spotState: {
      accountValue: '0',
      availableToTrade: '0',
      balances: [],
      balancesMap: {},
      tokenToAvailableAfterMaintenance: null,
    },
    userFunding: [],
    nonFundingLedgerUpdates: [],
    twapStates: [],
    twapHistory: [],
    twapSliceFills: [],
    soundEnabled: true,
    skipMarketCloseConfirm: false,
    candleInterval: CANDLE_MENU_KEY_V2.FIFTEEN_MINUTES,
    marketSlippage: 0.05, // default 5%
    marketEstSize: '',
    marketEstPrice: '',
    quoteUnit: 'base',
    // Trading panel state (preserved across orderType switches)
    // tradingOrderType: OrderType.MARKET,
    sizeDisplayUnit: 'base',
    tradingOrderSide: OrderSide.BUY,
    selectedTokenDetail: null,
    ...getInitTradingState(),
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
          [listName]: list.reverse().slice(0, 200),
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
      payload: {
        list: UserNonFundingLedgerUpdates[];
        isSnapshot?: boolean;
        needShowToast?: boolean;
      }
    ) {
      const { list, isSnapshot, needShowToast } = payload;

      const newList = list
        .filter((item) => {
          if (
            item.delta.type === 'deposit' ||
            item.delta.type === 'withdraw' ||
            item.delta.type === 'send' ||
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

          const {
            destination = '',
            usdcValue = '0',
            sourceDex,
            destinationDex,
            user,
          } = item.delta;
          if (
            item.delta.type === 'send' &&
            state.currentPerpsAccount?.address &&
            destination &&
            isSameAddress(destination, state.currentPerpsAccount?.address)
          ) {
            if (user && destination && isSameAddress(user, destination)) {
              return {
                time: item.time,
                hash: item.hash,
                destinationDex,
                type: 'transfer' as const,
                status: 'success' as const,
                usdValue: usdcValue?.toString(),
              };
            } else {
              return {
                time: item.time,
                hash: item.hash,
                type: 'receive' as const,
                status: 'success' as const,
                usdValue: usdcValue?.toString(),
              };
            }
          }

          if (
            item.delta.type === 'send' &&
            Object.values(HYPE_EVM_BRIDGE_ADDRESS_MAP).some((addr) =>
              isSameAddress(addr, destination)
            )
          ) {
            return {
              time: item.time,
              hash: item.hash,
              type: 'withdraw' as const,
              status: 'success' as const,
              usdValue: usdcValue.toString(),
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
            usdValue: item.delta.usdc || item.delta.usdcValue || '0',
          };
        });

      if (isSnapshot) {
        // Mirror mobile usePerpsStore: snapshot replays a (possibly large)
        // historical batch on WS reconnect. Take the latest ledger time per
        // type, then drop pending entries whose time is at or before that
        // cutoff — HL has already confirmed them.
        const maxTimeByType: Record<string, number> = {};
        for (const item of newList) {
          const prev = maxTimeByType[item.type];
          if (prev === undefined || item.time > prev) {
            maxTimeByType[item.type] = item.time;
          }
        }
        const filteredLocalHistory = state.localLoadingHistory.filter((p) => {
          const cutoff = maxTimeByType[p.type];
          return cutoff === undefined || p.time > cutoff;
        });

        return {
          ...state,
          localLoadingHistory: filteredLocalHistory,
          userAccountHistory: newList.reverse().slice(0, 200),
        };
      } else {
        if (needShowToast) {
          newList.forEach((item) => showDepositAndWithdrawToast(item));
        }
        // Mirror mobile usePerpsStore: any newly-arrived ledger event of type
        // X means we now have authoritative history for it — drop ALL pending
        // of that type wholesale. Simpler than time-bucket filtering and keeps
        // both clients behaving the same way.
        let filteredLocalHistory = [...state.localLoadingHistory];
        newList.forEach((item) => {
          filteredLocalHistory = filteredLocalHistory.filter(
            (i) => i.type !== item.type
          );
        });

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

    setClearinghouseStateMapBySingle(
      state,
      payload: {
        address: string;
        clearinghouseState: ClearinghouseState;
      }
    ) {
      if (!payload.address || !payload.clearinghouseState) {
        return state;
      }
      return {
        ...state,
        clearinghouseStateMap: {
          ...state.clearinghouseStateMap,
          [payload.address.toLowerCase()]: payload.clearinghouseState,
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

    setFillsOrderTpOrSl(state, payload: Record<string, 'tp' | 'sl'>) {
      return {
        ...state,
        fillsOrderTpOrSl: payload,
      };
    },

    setHasPermission(state, payload: boolean) {
      return {
        ...state,
        hasPermission: payload,
      };
    },

    setLocalLoadingHistory(state, payload: AccountHistoryItem[]) {
      // If WS already delivered a confirmed entry for this type,
      // skip adding the pending item (WS arrived before HTTP response)
      const filtered = payload.filter((item) => {
        return !state.userAccountHistory.some(
          (h) => h.type === item.type && h.time >= item.time
        );
      });
      if (filtered.length === 0) {
        return state;
      }
      return {
        ...state,
        localLoadingHistory: [...filtered, ...state.localLoadingHistory],
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
          userFills: fills.slice(0, 200),
        };
      } else {
        return {
          ...state,
          userFills: [...fills, ...state.userFills],
        };
      }
    },

    setPerpFee(state, payload: number) {
      return {
        ...state,
        perpFee: payload,
      };
    },

    setMarketData(
      state,
      payload: { list: MarketData[]; categories: PerpTopTokenCategory[] }
    ) {
      const baseList = payload.list || [];
      // Backfill ticker fields with the most recent WS snapshot — HTTP
      // `formatMarkData` initializes price/funding/volume to empty, and any
      // WS push that landed during the fetch window would otherwise be
      // wiped here.
      const list = applyAssetCtxsToList(baseList, lastCtxsByDex);
      return {
        ...state,
        marketData: list,
        marketDataMap: buildMarketDataMap(list),
        marketDataCategories: payload.categories,
      };
    },

    updateMarketData(state, payload: [string, AssetCtx[]][]) {
      if (payload.length === 0) {
        return state;
      }

      // Always cache the latest WS snapshot regardless of whether
      // `marketData` is populated yet — `setMarketData` (HTTP) reads from
      // this cache to merge ticker fields, so dropping early WS frames
      // would leave a flash of empty prices.
      lastCtxsByDex = buildCtxsByDex(payload);

      if (state.marketData.length === 0) {
        return state;
      }

      const newMarketData = applyAssetCtxsToList(
        state.marketData,
        lastCtxsByDex
      );
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
        accountNeedApproveAgent: false,
        accountNeedApproveBuilderFee: false,
      };
    },

    // Desktop Pro reducers
    resetProAccountInfo(state) {
      return {
        ...state,
        currentPerpsAccount: null,
        isInitialized: false,
        userAbstraction: UserAbstractionResp.default,
        isLogin: false,
        clearinghouseState: null,
        openOrders: [],
        historicalOrders: [],
        userFunding: [],
        nonFundingLedgerUpdates: [],
        twapStates: [],
        twapHistory: [],
        twapSliceFills: [],
        localLoadingHistory: [],
      };
    },

    resetTradingState(state) {
      return {
        ...state,
        ...getInitTradingState(),
      };
    },

    setSelectedCoin(state, payload: string) {
      // if (payload.includes(':')) {
      //   message.error('HIP-3 coin is not supported');
      //   return state;
      // }

      return {
        ...state,
        ...getInitTradingState(),
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

    setMarginModePreferences(
      state,
      payload: Record<string, 'cross' | 'isolated'>
    ) {
      return {
        ...state,
        marginModePreferences: payload,
      };
    },

    patchMarginModePreference(
      state,
      payload: { coin: string; mode: 'cross' | 'isolated' }
    ) {
      if (!payload.coin) return state;
      return {
        ...state,
        marginModePreferences: {
          ...state.marginModePreferences,
          [payload.coin]: payload.mode,
        },
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

    setSoundEnabled(state, payload: boolean) {
      return {
        ...state,
        soundEnabled: payload ?? true,
      };
    },

    setSkipMarketCloseConfirm(state, payload: boolean) {
      return {
        ...state,
        skipMarketCloseConfirm: payload,
      };
    },

    setCandleInterval(state, payload: CANDLE_MENU_KEY_V2) {
      return {
        ...state,
        candleInterval: payload,
      };
    },
  },

  effects: (dispatch) => ({
    async updateSelectedCoin(payload: string, rootState) {
      dispatch.perps.setSelectedCoin(payload);
      await rootState.app.wallet.setPerpsSelectedCoin(payload);
    },

    async updateQuoteUnit(payload: 'base' | 'usd', rootState) {
      dispatch.perps.patchState({
        quoteUnit: payload,
        sizeDisplayUnit: payload,
      });
      await rootState.app.wallet.setPerpsQuoteUnit(payload);
    },

    async updateSizeDisplayUnit(payload: 'base' | 'usd', rootState) {
      dispatch.perps.patchState({
        sizeDisplayUnit: payload,
        quoteUnit: payload,
      });
      await rootState.app.wallet.setPerpsQuoteUnit(payload);
    },
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
      // const sdk = getPerpsSDK();
      // try {
      //   const [clearinghouseState, openOrders] = await Promise.all([
      //     sdk.info.getClearingHouseState(),
      //     sdk.info.getFrontendOpenOrders(),
      //   ]);
      //   console.log('clearinghouseState', clearinghouseState);
      //   dispatch.perps.setPositionAndOpenOrders(clearinghouseState, openOrders);
      //   dispatch.perps.setAccountSummary({
      //     ...clearinghouseState.marginSummary,
      //     withdrawable: clearinghouseState.withdrawable,
      //   });
      // } catch (error: any) {
      //   console.error('Failed to fetch clearinghouse state:', error);
      // }
    },

    async fetchPerpPermission(address: string, rootState) {
      const {
        has_permission,
      } = await rootState.app.wallet.openapi.getPerpPermission({ id: address });
      dispatch.perps.setHasPermission(has_permission);
    },

    async fetchUserAbstraction(address: string) {
      try {
        const sdk = getPerpsSDK();
        const userAbstraction = await sdk.info.getUserAbstraction(address);
        dispatch.perps.patchState({ userAbstraction: userAbstraction });
      } catch (error) {
        console.error('Failed to fetch user abstraction:', error);
        dispatch.perps.patchState({
          userAbstraction: UserAbstractionResp.default,
        });
      }
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
      // await dispatch.perps.refreshData();
      if (isPro) {
        await dispatch.perps.fetchClearinghouseState();
        // other use subscribe to data
      } else {
        await dispatch.perps.fetchPositionAndOpenOrders();
        dispatch.perps.fetchUserHistoricalOrders();
      }

      // 订阅实时数据更新
      dispatch.perps.subscribeToUserData({
        address: account.address,
        type: account.type,
        isPro,
      });

      // dispatch.perps.startPolling(undefined);
      dispatch.perps.fetchUserAbstraction(account.address);
      dispatch.perps.fetchPerpPermission(account.address);
      setTimeout(() => {
        // avoid 429 error
        dispatch.perps.fetchPerpFee();
      }, 1000);
      console.log('loginPerpsAccount success', account.address);
    },

    /* @deprecated use websocket subscription push */
    async fetchClearinghouseState() {
      const sdk = getPerpsSDK();

      // const clearinghouseState = await sdk.info.getClearingHouseState();

      // dispatch.perps.updatePositionsWithClearinghouse(clearinghouseState);

      // dispatch.perps.patchClearinghouseState(clearinghouseState);
    },

    /* @deprecated use websocket subscription push */
    async fetchPositionOpenOrders() {
      const sdk = getPerpsSDK();
      // const openOrders = await sdk.info.getFrontendOpenOrders();
      // dispatch.perps.updateOpenOrders(openOrders);
      // dispatch.perps.patchState({ openOrders });
    },

    async fetchUserFillHistory() {
      const sdk = getPerpsSDK();
      const res = await sdk.info.getUserFills();
      dispatch.perps.patchState({
        userFills: ((res as unknown) as WsFill[]).slice(0, 2000),
      });
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
      dispatch.perps.fetchUserHistoricalOrders();
    },

    async fetchMarketData(_, rootState) {
      // Coalesce concurrent fetches: any caller arriving while a previous
      // request is still pending re-uses that promise instead of firing a
      // duplicate. The cache is cleared once settled so the next refresh
      // fires a fresh request.
      if (marketDataInFlight) return marketDataInFlight;

      const run = async () => {
        const sdk = getPerpsSDK();

        const fetchTopTokenList = async () => {
          try {
            if (topAssetsCache.length > 0) {
              return topAssetsCache;
            }
            const topAssets = await rootState.app.wallet.openapi.getPerpTopTokenListV3(
              {
                dex_id: 'all',
              }
            );
            if (topAssets.length > 0) {
              topAssetsCache = topAssets;
              return topAssets;
            } else {
              return DEFAULT_TOP_ASSET;
            }
          } catch (error) {
            console.error('Failed to fetch top assets:', error);
            return DEFAULT_TOP_ASSET;
          }
        };

        const fetchTokenCategories = async () => {
          if (perpsCategoryCache.length > 0) {
            return perpsCategoryCache;
          }
          try {
            const categories = await rootState.app.wallet.openapi.getPerpTokenCategories(
              {
                lang: 'en-US',
              }
            );
            if (categories.length > 0) {
              perpsCategoryCache = categories;
              return categories;
            }
          } catch (error) {
            console.error('Failed to fetch token categories:', error);
          }
          return DEFAULT_ASSET_CATEGORY;
        };

        const [topAssets, categories, allMetas, perpDexs] = await Promise.all([
          fetchTopTokenList(),
          fetchTokenCategories(),
          sdk.info.getPerpsAllMetas(),
          getCachedPerpDexs(sdk),
        ]);

        // perpDexs is an array parallel to allMetas; entry is either null (main dex='')
        // or { name: 'xyz', ... }. Build idx → dex name map.
        const dexIdMap: Record<number, string> = {};
        if (Array.isArray(perpDexs)) {
          perpDexs.forEach((dex: any, idx: number) => {
            dexIdMap[idx] = dex?.name ?? '';
          });
        }

        const formattedMarketData = formatMarkData(
          allMetas,
          topAssets,
          dexIdMap
        );
        dispatch.perps.setMarketData({
          list: formattedMarketData,
          categories,
        });
      };

      marketDataInFlight = run().finally(() => {
        marketDataInFlight = null;
      });
      return marketDataInFlight;
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
      payload: { address: string; type: Account['type']; isPro: boolean },
      rootState
    ) {
      const { address, type: addressType, isPro } = payload;
      const sdk = getPerpsSDK();
      const subscriptions: (() => void)[] = [];
      dispatch.perps.unsubscribeAll(undefined);
      const {
        unsubscribe: unsubscribeAllDexsAssetCtxs,
      } = sdk.ws.subscribeToAllDexsAssetCtxs((data) => {
        const { ctxs } = data;
        dispatch.perps.updateMarketData(ctxs);
      });
      subscriptions.push(unsubscribeAllDexsAssetCtxs);
      const {
        unsubscribe: unsubscribeClearinghouseState,
      } = sdk.ws.subscribeToAllDexsClearinghouseState(address, (data) => {
        const { clearinghouseStates } = data;
        const user = (data as any).user;
        if (!isSameAddress(user, address)) {
          return;
        }
        const clearinghouseState = formatAllDexsClearinghouseState(
          clearinghouseStates
        );
        if (!clearinghouseState) {
          return;
        }
        const latestState = store.getState().perps;
        if (
          latestState.userAbstraction === UserAbstractionResp.unifiedAccount
        ) {
          clearinghouseState.withdrawable = latestState.spotState.availableToTrade.toString();
        }
        dispatch.perps.patchClearinghouseState(clearinghouseState);
        dispatch.perps.setClearinghouseStateMapBySingle({
          address,
          clearinghouseState,
        });
      });
      subscriptions.push(unsubscribeClearinghouseState);

      const { unsubscribe: unsubscribeSpotState } = sdk.ws.subscribeToSpotState(
        (data) => {
          const { spotState, user } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          dispatch.perps.patchState({ spotState: formatSpotState(spotState) });
        }
      );
      subscriptions.push(unsubscribeSpotState);

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

      if (isPro) {
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
            handleUpdateHistoricalOrders(
              orderHistory,
              rootState.perps.soundEnabled
            );
          }

          dispatch.perps.patchStatsListBySnapshot({
            listName: 'historicalOrders',
            list: orderHistory,
            isSnapshot: isSnapshot || false,
          });
        });
        subscriptions.push(unsubscribeUserHistoricalOrders);

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
            handleUpdateTwapSliceFills(
              twapSliceFills,
              rootState.perps.soundEnabled
            );
          }

          dispatch.perps.patchStatsListBySnapshot({
            listName: 'twapSliceFills',
            list: twapSliceFills,
            isSnapshot: isSnapshot || false,
          });
        });
        subscriptions.push(unsubscribeUserTwapSliceFills);
      }

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
          needShowToast: isPro,
        });
      });
      subscriptions.push(unsubscribeUserNonFundingLedgerUpdates);

      const { unsubscribe: unsubscribeFills } = sdk.ws.subscribeToUserFills(
        (data) => {
          console.log('User fills update:', data);
          const { fills, isSnapshot, user } = data;
          if (!isSameAddress(user, address)) {
            return;
          }

          if (isSnapshot) {
            // when return snapshot, fetch all user fill history from api
            dispatch.perps.fetchUserFillHistory();
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
        dispatch.perps.setFavoritedCoins(favoritedCoins);
      } catch (error) {
        console.error('Failed to load favorited coins:', error);
      }
    },

    async initSelectedCoin(_, rootState) {
      try {
        const selectedCoin = await rootState.app.wallet.getPerpsSelectedCoin();
        dispatch.perps.setSelectedCoin(selectedCoin ?? 'BTC');
      } catch (error) {
        console.error('Failed to load selected coin:', error);
        dispatch.perps.setSelectedCoin('BTC');
      }
    },

    async initQuoteUnit(_, rootState) {
      try {
        const quoteUnit = await rootState.app.wallet.getPerpsQuoteUnit();
        dispatch.perps.patchState({
          quoteUnit: quoteUnit ?? 'base',
          sizeDisplayUnit: quoteUnit === 'usd' ? 'usd' : 'base',
        });
      } catch (error) {
        console.error('Failed to load quote unit:', error);
        dispatch.perps.patchState({
          quoteUnit: 'base',
          sizeDisplayUnit: 'base',
        });
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

    async initMarginModePreferences(_, rootState) {
      try {
        const preferences = await rootState.app.wallet.getPerpsMarginModePreferences();
        dispatch.perps.setMarginModePreferences(preferences || {});
      } catch (error) {
        console.error('Failed to load margin mode preferences:', error);
      }
    },

    async setMarginModePreference(
      payload: { coin: string; mode: 'cross' | 'isolated' },
      rootState
    ) {
      try {
        dispatch.perps.patchMarginModePreference(payload);
        await rootState.app.wallet.setPerpsMarginModePreference(
          payload.coin,
          payload.mode
        );
      } catch (error) {
        console.error('Failed to save margin mode preference:', error);
      }
    },

    async initMarketSlippage(_, rootState) {
      try {
        const slippage = await rootState.app.wallet.getMarketSlippage();
        dispatch.perps.setMarketSlippage(slippage ?? 0.05);
      } catch (error) {
        console.error('Failed to load market slippage:', error);
        dispatch.perps.setMarketSlippage(0.05);
      }
    },

    async initSkipMarketCloseConfirm(_, rootState) {
      try {
        const skip = await rootState.app.wallet.getSkipMarketCloseConfirm();
        dispatch.perps.setSkipMarketCloseConfirm(skip ?? false);
      } catch (error) {
        dispatch.perps.setSkipMarketCloseConfirm(false);
      }
    },

    async initSoundEnabled(_, rootState) {
      try {
        const soundEnabled = await rootState.app.wallet.getSoundEnabled();
        dispatch.perps.setSoundEnabled(soundEnabled ?? true);
      } catch (error) {
        console.error('Failed to load sound enabled:', error);
        dispatch.perps.setSoundEnabled(true);
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

    async updateEnabledSound(enabled: boolean, rootState) {
      try {
        await rootState.app.wallet.setSoundEnabled(enabled);
        dispatch.perps.setSoundEnabled(enabled);
      } catch (error) {
        console.error('Failed to save sound enabled:', error);
      }
    },

    async updateSkipMarketCloseConfirm(skip: boolean, rootState) {
      try {
        await rootState.app.wallet.setSkipMarketCloseConfirm(skip);
        dispatch.perps.setSkipMarketCloseConfirm(skip);
      } catch (error) {
        console.error('Failed to save skipMarketCloseConfirm:', error);
      }
    },

    async initCandleInterval(_, rootState) {
      try {
        const stored = await rootState.app.wallet.getPerpsCandleInterval();
        // Storage holds a free-form string; coerce to a known enum value so
        // stale/unrecognized values fall back to the default instead of
        // breaking the chart.
        const valid = Object.values(CANDLE_MENU_KEY_V2) as string[];
        const next =
          stored && valid.includes(stored)
            ? (stored as CANDLE_MENU_KEY_V2)
            : CANDLE_MENU_KEY_V2.FIFTEEN_MINUTES;
        dispatch.perps.setCandleInterval(next);
      } catch (error) {
        console.error('Failed to load candle interval:', error);
        dispatch.perps.setCandleInterval(CANDLE_MENU_KEY_V2.FIFTEEN_MINUTES);
      }
    },

    async updateCandleInterval(interval: CANDLE_MENU_KEY_V2, rootState) {
      dispatch.perps.setCandleInterval(interval);
      try {
        await rootState.app.wallet.setPerpsCandleInterval(interval);
      } catch (error) {
        console.error('Failed to save candle interval:', error);
      }
    },
  }),
});

export default perps;
