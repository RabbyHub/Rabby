import { create } from 'zustand';
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
  SpotMeta,
  FFastAssetCtx,
  WsFastAssetCtxs,
  UserAbstractionResp,
} from '@rabby-wallet/hyperliquid-sdk';
import { Account } from '@/background/service/preference';
import { wallet } from '@/ui/wallet';
import { destroyPerpsSDK, getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { formatMarkData, getPxDecimals } from '../views/Perps/utils';
import {
  loadDefaultTopAsset,
  loadDefaultAssetCategory,
  HYPE_EVM_BRIDGE_ADDRESS_MAP,
  PerpsQuoteAsset,
  CANDLE_MENU_KEY_V2,
  getSpotBalanceKey,
} from '../views/Perps/constants';
import type {
  ApproveSignatures,
  PerpsTpslModePreference,
  PerpsTpslModePreferences,
} from '@/background/service/perps';
import { DEFAULT_PERPS_ORDER_CONFIRMATIONS } from '@/constant/perps';
import type {
  PerpsOrderConfirmations,
  PerpsOrderConfirmType,
} from '@/constant/perps';
import { maxBy } from 'lodash';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { isSameAddress, sleep } from '../utils';
import {
  formatAllDexsClearinghouseState,
  AggregatedClearinghouseState,
  handleUpdateHistoricalOrders,
  handleUpdateTwapSliceFills,
  showDepositAndWithdrawToast,
  formatSpotState,
  SpotBalance,
  getCachedPerpDexs,
  fetchAllDexsRaw,
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
import {
  parsePortfolioResponseStrict,
  PortfolioData,
} from '@/ui/views/Perps/utils/perpsPortfolio';
import { StakingSummaryAmounts } from '@/ui/views/Perps/utils/accountPricing';

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
  categoryId: string;
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
const DEFAULT_POSITION_TPSL_MODE_PREFERENCES: PerpsTpslModePreferences = {
  tp: 'pnl',
  sl: 'pnl',
};

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

export type PortfolioEntry = {
  data: PortfolioData | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  updatedAt: number;
};

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
  // True after the first WS clearinghouseState frame for the current user.
  isUserDataReady: boolean;
  // True after the first WS asset ticker frame.
  isMarketTickerReady: boolean;
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
  tpslModePreferences: PerpsTpslModePreferences;
  chartInterval: string;
  wsActiveAssetCtx: WsActiveAssetCtx | null;
  wsActiveAssetData: WsActiveAssetData | null;
  clearinghouseState: AggregatedClearinghouseState | null;
  openOrders: OpenOrder[];
  // Aggregated state keyed by **account address** — populated for every known
  // perps account so the account selector can show their balances. Not the
  // same as `dexClearinghouseStates` below.
  clearinghouseStateMap: Record<string, AggregatedClearinghouseState | null>;
  // Raw per-dex cache for the **current account** keyed by dex name
  // ('' = hyper main). WS and HTTP both write here with time guards; the
  // aggregated `clearinghouseState` / `clearinghouseStateMap` are rebuilt
  // from this map.
  dexClearinghouseStates: Record<string, ClearinghouseState>;
  spotState: {
    accountValue: string;
    availableToTrade: string;
    balances: SpotBalance[];
    balancesMap: Record<string, SpotBalance>;
    tokenToAvailableAfterMaintenance: [number, string][] | null;
    // Portfolio-margin account-level fields (passed through from the WS spotState)
    portfolioMarginEnabled?: boolean;
    portfolioMarginRatio?: string;
    tokenToPortfolioBorrowRatio?: [number, string][];
  };
  // Combined spot+perp mark/mid price map from the `fastAssetCtxs` WS feed,
  // merged across delta frames. Keyed by coin (perp) / '@index' (spot) / '#n'.
  spotAssetCtxs: Record<string, FFastAssetCtx>;
  // Static spot metadata (token list + pair universe); fetched once on login.
  spotMeta: SpotMeta | null;
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
  orderConfirmations: PerpsOrderConfirmations;
  /** Whether the bottom status bar renders the popular-markets ticker. */
  showPopularTradings: boolean;
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
  /**
   * Staking-account HYPE for the current account. REST only (no WS feed):
   * staked HYPE sits outside spotState, yet the official portfolio series
   * counts it — the live Portfolio Value needs it to match.
   */
  stakingSummary: StakingSummaryAmounts | null;
  stakingStatus: 'idle' | 'loading' | 'success' | 'error';
  /** First spotState frame has landed (spot balances are usable). */
  isSpotStateReady: boolean;
  /** Portfolio net-value series, keyed by lowercased address. */
  portfolioMap: Record<string, PortfolioEntry>;
}

let topAssetsCache: PerpTopTokenV3[] = [];
let perpsCategoryCache: PerpTopTokenCategory[] = [];

// The baked-in lists are behind dynamic `import()`s, so reaching for them can
// itself reject (chunk missing after an update, offline, disk error). They are
// already the fallback path — losing them must degrade to an empty list, not
// reject the `Promise.all` that market-data init is built on.
const loadDefaultTopAssetSafe = async (): Promise<PerpTopTokenV3[]> => {
  try {
    return await loadDefaultTopAsset();
  } catch (error) {
    console.error('Failed to load bundled top assets:', error);
    return [];
  }
};

const loadDefaultAssetCategorySafe = async (): Promise<
  PerpTopTokenCategory[]
> => {
  try {
    return await loadDefaultAssetCategory();
  } catch (error) {
    console.error('Failed to load bundled asset categories:', error);
    return [];
  }
};

// Latest per-dex AssetCtx snapshot pushed by WS. WS frames are full-dex
// snapshots, so the latest one is authoritative. Stored at module scope so
// `setMarketData` (HTTP path, ticker fields are empty after `formatMarkData`)
// can backfill any ticker data that arrived during the fetch window —
// otherwise prices/funding/volume would briefly flash to empty until the next
// WS tick.
let lastCtxsByDex: Record<string, AssetCtx[]> = {};

let marketDataInFlight: Promise<void> | null = null;

const stakingSummaryInFlight = new Map<string, Promise<void>>();
const portfolioInFlight = new Map<string, Promise<void>>();

// The `portfolio` info endpoint ignores any period parameter and always
// returns all periods at once, so 1D/1W/1M/All is a client-side slice —
// switching range must NOT refetch. This is the freshness window before a
// re-fetch is allowed.
const PORTFOLIO_FRESH_TTL_MS = 10_000;

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
      // Tick precision follows the price MAGNITUDE (5-sig-figs rule), so it
      // only changes when the price crosses a power of ten — stable per tick.
      pxDecimals: getPxDecimals(item.szDecimals, ctx.markPx ?? item.markPx),
    };
  });
};

// Overlay fresh markPx/midPx from the fastAssetCtxs feed onto the perp
// marketData list (matched by coin name). fastAssetCtxs is HL's upgraded combined
// feed that supersedes the throttled allDexsAssetCtxs for PRICES; the rest of each
// ctx (oraclePx / funding / openInterest / ...) still comes from allDexsAssetCtxs
// via applyAssetCtxsToList. Returns the same reference when nothing changed so the
// map rebuild + re-render is skipped.
const overlayFastCtxsToMarketData = (
  list: MarketData[],
  fastCtxs: WsFastAssetCtxs
): MarketData[] => {
  let changed = false;
  const next = list.map((item) => {
    const fc = fastCtxs[item.name];
    if (!fc) return item;
    const markPx = fc.markPx != null ? fc.markPx : item.markPx;
    const midPx = fc.midPx != null ? fc.midPx : item.midPx;
    if (markPx === item.markPx && midPx === item.midPx) return item;
    changed = true;
    return {
      ...item,
      markPx,
      midPx,
      pxDecimals: getPxDecimals(item.szDecimals, markPx ?? item.markPx),
    };
  });
  return changed ? next : list;
};

export const getDefaultPerpsState = (): PerpsState =>
  ({
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
    isUserDataReady: false,
    isMarketTickerReady: false,
    userFills: [],
    approveSignatures: [],
    wsSubscriptions: [],
    pollingTimer: null,
    fillsOrderTpOrSl: {},
    // Desktop Pro fields
    selectedCoin: 'BTC',
    favoritedCoins: [],
    marginModePreferences: {},
    tpslModePreferences: DEFAULT_POSITION_TPSL_MODE_PREFERENCES,
    chartInterval: '15m',
    wsActiveAssetCtx: null,
    wsActiveAssetData: null,
    clearinghouseState: null,
    clearinghouseStateMap: {},
    dexClearinghouseStates: {},
    openOrders: [],
    historicalOrders: [],
    userAbstraction: 'default',
    spotState: {
      accountValue: '0',
      availableToTrade: '0',
      balances: [],
      balancesMap: {},
      tokenToAvailableAfterMaintenance: null,
      portfolioMarginEnabled: false,
      portfolioMarginRatio: undefined,
      tokenToPortfolioBorrowRatio: undefined,
    },
    spotAssetCtxs: {},
    spotMeta: null,
    userFunding: [],
    nonFundingLedgerUpdates: [],
    twapStates: [],
    twapHistory: [],
    twapSliceFills: [],
    soundEnabled: true,
    skipMarketCloseConfirm: false,
    orderConfirmations: DEFAULT_PERPS_ORDER_CONFIRMATIONS,
    showPopularTradings: true,
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
    stakingSummary: null,
    stakingStatus: 'idle',
    isSpotStateReady: false,
    portfolioMap: {},
    ...getInitTradingState(),
  } as PerpsState);

type PerpsReducerMap = Record<
  string,
  (state: PerpsState, ...args: any[]) => PerpsState
>;

const definePerpsReducers = <Reducers extends PerpsReducerMap>(
  reducers: Reducers
) => reducers;

const perpsReducers = definePerpsReducers({
  patchState(state, payload: Partial<PerpsState>) {
    return {
      ...state,
      ...payload,
    };
  },

  // fastAssetCtxs frames are deltas: the first frame is a snapshot, later
  // frames carry only updated coins and omit unchanged fields. Merge per-coin
  // so a markPx-only (or midPx-only) update doesn't wipe the other field.
  mergeFastAssetCtxs(state, payload: WsFastAssetCtxs) {
    if (!payload) return state;
    // 1) spot price map — collateral valuation (AccountInfo PM/unified rows).
    const nextSpot: Record<string, FFastAssetCtx> = {
      ...state.spotAssetCtxs,
    };
    for (const coin of Object.keys(payload)) {
      nextSpot[coin] = { ...nextSpot[coin], ...payload[coin] };
    }
    // 2) Overlay fresh perp markPx/midPx onto marketData (fastAssetCtxs is the
    //    upgraded combined feed; allDexsAssetCtxs was throttled post-upgrade).
    const nextMarketData = overlayFastCtxsToMarketData(
      state.marketData,
      payload
    );
    return {
      ...state,
      spotAssetCtxs: nextSpot,
      marketData: nextMarketData,
      marketDataMap:
        nextMarketData === state.marketData
          ? state.marketDataMap
          : buildMarketDataMap(nextMarketData),
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
      clearinghouseState: AggregatedClearinghouseState;
    }
  ) {
    if (!payload.address || !payload.clearinghouseState) {
      return state;
    }
    const key = payload.address.toLowerCase();
    const existing = state.clearinghouseStateMap?.[key];
    if (
      existing &&
      (payload.clearinghouseState.time ?? 0) <= (existing.time ?? 0)
    ) {
      return state;
    }
    return {
      ...state,
      clearinghouseStateMap: {
        ...state.clearinghouseStateMap,
        [key]: payload.clearinghouseState,
      },
    };
  },

  patchClearinghouseState(state, payload: AggregatedClearinghouseState) {
    const currentStateTime = state.clearinghouseState?.time || 0;
    if (payload.time <= currentStateTime) {
      return state;
    }
    return {
      ...state,
      clearinghouseState: payload,
      isUserDataReady: true,
    };
  },

  // Per-dex write with time guard so stale HTTP never clobbers fresh WS.
  patchDexClearinghouseState(
    state,
    payload: { dex: string; state: ClearinghouseState }
  ) {
    if (!payload.state) return state;
    const existing = state.dexClearinghouseStates?.[payload.dex];
    if (existing && (payload.state.time ?? 0) <= (existing.time ?? 0)) {
      return state;
    }
    return {
      ...state,
      dexClearinghouseStates: {
        ...state.dexClearinghouseStates,
        [payload.dex]: payload.state,
      },
    };
  },

  patchPortfolioEntry(
    state,
    payload: { key: string } & Partial<PortfolioEntry>
  ) {
    const { key, ...rest } = payload;
    const prev = state.portfolioMap[key] || {
      data: null,
      status: 'idle' as const,
      updatedAt: 0,
    };
    return {
      ...state,
      portfolioMap: { ...state.portfolioMap, [key]: { ...prev, ...rest } },
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
      // First WS ticker frame arrived before HTTP meta — still mark
      // ticker as ready so `waitForInitialWsData` can resolve.
      return state.isMarketTickerReady
        ? state
        : { ...state, isMarketTickerReady: true };
    }

    const newMarketData = applyAssetCtxsToList(state.marketData, lastCtxsByDex);
    return {
      ...state,
      isMarketTickerReady: true,
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
    // Every switch path funnels through here. The per-account REST snapshot
    // (staking), the spot readiness flag, and the perps user-data readiness
    // flag all describe the OLD account until their next fetch / next frame
    // lands — carrying them over would price one account's assets into
    // another's card (e.g. manual mode gating on a stale isUserDataReady:true
    // while clearinghouseState still holds the old account's equity).
    const changed =
      payload?.address?.toLowerCase() !==
      state.currentPerpsAccount?.address?.toLowerCase();
    return {
      ...state,
      currentPerpsAccount: payload,
      isLogin: !!payload,
      ...(changed
        ? {
            stakingSummary: null,
            stakingStatus: 'idle' as const,
            isSpotStateReady: false,
            isUserDataReady: false,
            // Per-dex frames are keyed by dex, not address; leftovers from
            // the previous account would be re-aggregated into this one and
            // their newer timestamps could make the WS path drop this
            // account's first frame.
            dexClearinghouseStates: {},
          }
        : {}),
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
      stakingSummary: null,
      stakingStatus: 'idle',
      isSpotStateReady: false,
      // Logout clears the whole cache; account-switch keeps it bucketed by
      // address instead (see resetProAccountInfo).
      portfolioMap: {},
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
      stakingSummary: null,
      stakingStatus: 'idle',
      isSpotStateReady: false,
      // portfolioMap is bucketed by address and intentionally kept: the next
      // account reads its own bucket, and cached data avoids a flash on
      // switching back.
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

  setTpslModePreferences(state, payload: PerpsTpslModePreferences) {
    return {
      ...state,
      tpslModePreferences: {
        ...DEFAULT_POSITION_TPSL_MODE_PREFERENCES,
        ...(payload || {}),
      },
    };
  },

  patchTpslModePreference(
    state,
    payload: { side: 'tp' | 'sl'; mode: PerpsTpslModePreference }
  ) {
    if (!payload.side) return state;
    return {
      ...state,
      tpslModePreferences: {
        ...DEFAULT_POSITION_TPSL_MODE_PREFERENCES,
        ...state.tpslModePreferences,
        [payload.side]: payload.mode,
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

  setOrderConfirmations(state, payload: Partial<PerpsOrderConfirmations>) {
    return {
      ...state,
      orderConfirmations: {
        ...DEFAULT_PERPS_ORDER_CONFIRMATIONS,
        ...state.orderConfirmations,
        ...payload,
      },
    };
  },

  setShowPopularTradings(state, payload: boolean) {
    return {
      ...state,
      showPopularTradings: payload ?? true,
    };
  },

  setCandleInterval(state, payload: CANDLE_MENU_KEY_V2) {
    return {
      ...state,
      candleInterval: payload,
    };
  },
});

type PerpsRootState = {
  app: { wallet: typeof wallet };
  perps: PerpsState;
};

type PerpsDispatch = {
  perps: Record<string, (...args: any[]) => any>;
};

const createPerpsEffects = (dispatch: PerpsDispatch) => ({
  async updateSelectedCoin(payload: string, rootState: PerpsRootState) {
    dispatch.perps.setSelectedCoin(payload);
    await rootState.app.wallet.setPerpsSelectedCoin(payload);
  },

  async updateQuoteUnit(payload: 'base' | 'usd', rootState: PerpsRootState) {
    dispatch.perps.patchState({
      quoteUnit: payload,
      sizeDisplayUnit: payload,
    });
    await rootState.app.wallet.setPerpsQuoteUnit(payload);
  },

  async updateSizeDisplayUnit(
    payload: 'base' | 'usd',
    rootState: PerpsRootState
  ) {
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
    rootState: PerpsRootState
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

  async fetchPerpPermission(address: string, rootState: PerpsRootState) {
    const {
      has_permission,
    } = await rootState.app.wallet.openapi.getPerpPermission({ id: address });
    dispatch.perps.setHasPermission(has_permission);
  },

  async fetchUserAbstraction(address: string) {
    // '' is the SDK's "use the logged-in address" convention (two call sites
    // rely on it: usePerpsProState.ts / usePerpsState.ts pass '' after
    // agentSetAbstraction so the SDK falls back to `this.masterAddress`).
    // Resolve it to the current account up front so the post-await guard has
    // something real to compare against — comparing '' to a real address
    // would never match and silently drop every empty-address call.
    const target =
      address || usePerpsStore.getState().currentPerpsAccount?.address || '';
    if (!target) return;
    const isStillCurrent = () =>
      usePerpsStore.getState().currentPerpsAccount?.address?.toLowerCase() ===
      target.toLowerCase();
    try {
      const sdk = getPerpsSDK();
      const userAbstraction = await sdk.info.getUserAbstraction(target);
      // The user may have switched perps accounts while this was in flight;
      // a response for the account switched away from must not overwrite the
      // newly-selected account's userAbstraction.
      if (!isStillCurrent()) return;
      dispatch.perps.patchState({ userAbstraction: userAbstraction });
    } catch (error) {
      console.error('Failed to fetch user abstraction:', error);
      // Same guard: a late failure for the previous account must not reset
      // the current account's mode.
      if (!isStillCurrent()) return;
      dispatch.perps.patchState({
        userAbstraction: UserAbstractionResp.default,
      });
    }
  },

  // Static spot metadata (token list + pair universe). Fetched once on login;
  // maps a held token name -> its spot pair key ('@index') for spot pricing.
  async fetchSpotMeta() {
    try {
      const sdk = getPerpsSDK();
      const spotMeta = await sdk.info.getSpotMeta();
      dispatch.perps.patchState({ spotMeta });
    } catch (error) {
      console.error('Failed to fetch spot meta:', error);
    }
  },

  // Staking has no WS feed, so this is a REST snapshot. Single-flight by
  // address; the response is dropped if the account switched while it was in
  // flight, and an error never downgrades a value we already have.
  async fetchStakingSummary(address: string) {
    const key = address?.toLowerCase();
    if (!key) return;
    const inFlight = stakingSummaryInFlight.get(key);
    if (inFlight) return inFlight;

    const task = (async () => {
      try {
        // `rootState` is a SNAPSHOT taken when the effect was dispatched
        // (the wrapper injects `perps: get()`, and zustand replaces the
        // state object on every `set`), so it never reflects an account
        // switch that happens while this effect is running. Read live
        // state for the loading gate too.
        const current = usePerpsStore.getState().stakingStatus;
        if (current !== 'success' && current !== 'loading') {
          dispatch.perps.patchState({ stakingStatus: 'loading' });
        }
        const sdk = getPerpsSDK();
        const raw = await sdk.info.getDelegatorSummary(address);
        // Account may have switched while this was in flight. `rootState` is
        // a SNAPSHOT taken when the effect was dispatched (the wrapper injects
        // `perps: get()`, and zustand replaces the state object on every set),
        // so it would still name the account we started with — re-read live
        // state here.
        const latest = usePerpsStore.getState();
        if (latest.currentPerpsAccount?.address?.toLowerCase() !== key) {
          return;
        }
        const next: StakingSummaryAmounts = {
          delegated: String(raw?.delegated ?? '0'),
          undelegated: String(raw?.undelegated ?? '0'),
          totalPendingWithdrawal: String(raw?.totalPendingWithdrawal ?? '0'),
        };
        const prev = latest.stakingSummary;
        // Keep the old object identity when nothing changed so subscribers
        // don't re-render on every poll.
        const same =
          prev &&
          prev.delegated === next.delegated &&
          prev.undelegated === next.undelegated &&
          prev.totalPendingWithdrawal === next.totalPendingWithdrawal;
        dispatch.perps.patchState({
          stakingSummary: same ? prev : next,
          stakingStatus: 'success',
        });
      } catch (e) {
        console.error('[perps] fetchStakingSummary failed', e);
        // Same guard as the success path: a late failure for the previous
        // account must not mark the current account's staking as errored.
        if (
          usePerpsStore
            .getState()
            .currentPerpsAccount?.address?.toLowerCase() !== key
        ) {
          return;
        }
        // Live read again — see the snapshot note above.
        if (usePerpsStore.getState().stakingStatus !== 'success') {
          dispatch.perps.patchState({ stakingStatus: 'error' });
        }
      } finally {
        stakingSummaryInFlight.delete(key);
      }
    })();

    stakingSummaryInFlight.set(key, task);
    return task;
  },

  // The `portfolio` info endpoint ignores any period parameter and always
  // returns all periods at once, so 1D/1W/1M/All is a client-side slice —
  // switching range must NOT refetch.
  async fetchPerpsPortfolio(
    payload: { address: string; force?: boolean },
    rootState: PerpsRootState
  ) {
    const key = payload.address?.toLowerCase();
    if (!key) return;
    const entry = rootState.perps.portfolioMap[key];
    if (
      !payload.force &&
      entry?.status === 'success' &&
      Date.now() - entry.updatedAt < PORTFOLIO_FRESH_TTL_MS
    ) {
      return;
    }
    const inFlight = portfolioInFlight.get(key);
    if (inFlight) return inFlight;

    const task = (async () => {
      try {
        // Only show a loading state when there is nothing to display yet;
        // a background refresh must not blank an already-rendered card.
        if (!entry?.data) {
          dispatch.perps.patchPortfolioEntry({ key, status: 'loading' });
        }
        const sdk = getPerpsSDK();
        // The popup often doesn't survive to the next 60s poll, so a first
        // failure gets 2 retries here (spec 1.7) instead of leaving the card
        // stuck on its skeleton until the interval happens to come back
        // around while the popup is still open.
        const MAX_ATTEMPTS = 3;
        let lastError: unknown;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const raw = await sdk.info.getPortfolio(payload.address);
            const data = parsePortfolioResponseStrict(raw);
            dispatch.perps.patchPortfolioEntry({
              key,
              data,
              status: 'success',
              updatedAt: Date.now(),
            });
            return;
          } catch (e) {
            lastError = e;
            if (attempt < MAX_ATTEMPTS) await sleep(500);
          }
        }
        console.error('[perps] fetchPerpsPortfolio failed', lastError);
        // Keep prior data; only flag the status.
        dispatch.perps.patchPortfolioEntry({ key, status: 'error' });
      } finally {
        portfolioInFlight.delete(key);
      }
    })();

    portfolioInFlight.set(key, task);
    return task;
  },

  async loginPerpsAccount(
    payload: {
      account: Account;
      isPro: boolean;
    },
    rootState: PerpsRootState
  ) {
    const { account, isPro } = payload;
    await rootState.app.wallet.setPerpsCurrentAccount(account);
    rootState.app.wallet.switchDesktopPerpsAccount(account);
    // await dispatch.perps.refreshData();
    if (!isPro) {
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
    // Both popup and Pro need the spot pricing index: Portfolio Value prices
    // every spot asset (and staked HYPE) through it.
    dispatch.perps.fetchSpotMeta();
    dispatch.perps.fetchPerpPermission(account.address);
    setTimeout(() => {
      // avoid 429 error
      dispatch.perps.fetchPerpFee();
    }, 1000);
    console.log('loginPerpsAccount success', account.address);
  },

  // `{ dex }` refreshes one dex (single-position actions). No arg refreshes
  // all dexes (close-all / withdraw / legacy callers).
  async fetchClearinghouseState(payload?: { dex?: string }) {
    if (payload && typeof payload.dex === 'string') {
      await dispatch.perps.fetchSingleDexClearinghouseState({
        dex: payload.dex,
      });
      return;
    }
    await dispatch.perps.fetchAllDexsClearinghouseState();
  },

  async fetchSingleDexClearinghouseState(
    payload: { dex: string },
    rootState: PerpsRootState
  ) {
    const address = rootState.perps.currentPerpsAccount?.address;
    if (!address) return;
    const sdk = getPerpsSDK();
    const dexParam = payload.dex || undefined; // '' is hyper main → undefined
    try {
      const dexState = await sdk.info.getClearingHouseState(address, dexParam);
      if (!dexState) return;
      // A→B switch mid-flight: rebuild would drop this, but the per-dex map
      // must not be repopulated with A's frames either — they would be
      // re-aggregated into B and could out-timestamp B's first WS frame.
      if (
        usePerpsStore.getState().currentPerpsAccount?.address?.toLowerCase() !==
        address.toLowerCase()
      ) {
        return;
      }
      dispatch.perps.patchDexClearinghouseState({
        dex: payload.dex,
        state: dexState,
      });
      await dispatch.perps.rebuildAggregatedClearinghouseState({ address });
    } catch (error) {
      console.error('fetchSingleDexClearinghouseState failed', error);
    }
  },

  async fetchAllDexsClearinghouseState(
    _: void | undefined,
    rootState: PerpsRootState
  ) {
    const address = rootState.perps.currentPerpsAccount?.address;
    if (!address) return;
    try {
      const allStates = await fetchAllDexsRaw(address);
      // A→B switch mid-flight: rebuild would drop this, but the per-dex map
      // must not be repopulated with A's frames either — they would be
      // re-aggregated into B and could out-timestamp B's first WS frame.
      if (
        usePerpsStore.getState().currentPerpsAccount?.address?.toLowerCase() !==
        address.toLowerCase()
      ) {
        return;
      }
      // Bulk-replace the per-dex map in one dispatch (mirrors the WS path
      // and avoids N subscriber notifications). Skips per-key time guards,
      // which is fine: HTTP responses for all dexes come from the same
      // server tick window, so we treat them as one frame.
      const nextMap: Record<string, ClearinghouseState> = {};
      for (const [dex, s] of allStates) {
        if (s) nextMap[dex] = s;
      }
      dispatch.perps.patchState({ dexClearinghouseStates: nextMap });
      await dispatch.perps.rebuildAggregatedClearinghouseState({ address });
    } catch (error) {
      console.error('fetchAllDexsClearinghouseState failed', error);
    }
  },

  async rebuildAggregatedClearinghouseState(
    payload: { address: string },
    rootState: PerpsRootState
  ) {
    if (!payload.address) return;
    // `rootState` is a SNAPSHOT taken when the effect was dispatched (the
    // wrapper injects `perps: get()`, and zustand replaces the state object
    // on every `set`), so it can go stale while this effect runs. Read live
    // state for the account guard and the unified-account overwrite — same
    // pattern as fetchStakingSummary.
    const live = usePerpsStore.getState();
    // `payload.address` is the account the CALLER captured before its own
    // await; the user may have switched since. (This effect itself has no
    // await, so rootState cannot go stale within it — the guard is about the
    // caller's request, not this function's snapshot.)
    if (
      live.currentPerpsAccount?.address?.toLowerCase() !==
      payload.address?.toLowerCase()
    ) {
      return;
    }
    const dexMap = live.dexClearinghouseStates || {};
    // formatAllDexsClearinghouseState seeds marginSummary from entries[0],
    // so bail if hyper isn't cached yet (HTTP single-dex can race ahead of
    // the first WS frame).
    if (!dexMap['']) return;
    const entries: [string, ClearinghouseState][] = Object.entries(dexMap);
    // make hyper state the first entry so `formatAllDexsClearinghouseState` uses it as the base for marginSummary; order of the rest doesn't matter
    entries.sort((a, b) => (a[0] === '' ? -1 : b[0] === '' ? 1 : 0));
    const aggregated = formatAllDexsClearinghouseState(entries);
    if (!aggregated) return;
    if (live.userAbstraction === UserAbstractionResp.unifiedAccount) {
      // USDC-only (matches mobile): the cross-stablecoin sum used to live
      // here, but Available now counts USDC alone. Preserve the perps-side
      // withdrawable instead of discarding it, so this stays the single
      // definition of the Available basis for every reader of `withdrawable`.
      const perpsWithdrawable = new BigNumber(aggregated.withdrawable || 0);
      aggregated.perpsWithdrawable = perpsWithdrawable.toString();
      const usdcAvailable =
        live.spotState.balancesMap?.[getSpotBalanceKey('USDC')]?.available || 0;
      aggregated.withdrawable = perpsWithdrawable
        .plus(usdcAvailable)
        .toString();
    }
    dispatch.perps.patchClearinghouseState(aggregated);
    dispatch.perps.setClearinghouseStateMapBySingle({
      address: payload.address,
      clearinghouseState: aggregated,
    });
  },

  /* @deprecated use websocket subscription push */
  async fetchPositionOpenOrders() {
    const sdk = getPerpsSDK();
    // const openOrders = await sdk.info.getFrontendOpenOrders();
    // dispatch.perps.updateOpenOrders(openOrders);
    // dispatch.perps.patchState({ openOrders });
  },

  // Refresh single dex's openOrders right after a place/cancel; WS reconciles drift.
  async fetchPositionOpenOrdersHttp(payload: { dex: string }) {
    await dispatch.perps.fetchPositionOpenOrdersHttpForDexes({
      dexes: [payload.dex],
    });
  },

  // Multi-dex variant (Cancel-All): one batched flush.
  async fetchPositionOpenOrdersHttpForDexes(payload: { dexes: string[] }) {
    const initial = usePerpsStore.getState();
    const address = initial.currentPerpsAccount?.address;
    if (!address) return;
    const unique = Array.from(new Set(payload.dexes));
    if (unique.length === 0) return;
    const sdk = getPerpsSDK();
    const results = await Promise.all(
      unique.map(async (dex) => {
        try {
          const orders = await sdk.info.getFrontendOpenOrders(
            address,
            dex || undefined
          );
          return { dex, orders };
        } catch (e) {
          console.error('[fetchPositionOpenOrdersHttpForDexes] failed', dex, e);
          return null;
        }
      })
    );
    const latest = usePerpsStore.getState();
    if (latest.currentPerpsAccount?.address !== address) return;
    const successful = results.filter(
      (r): r is { dex: string; orders: OpenOrder[] } => r !== null
    );
    if (successful.length === 0) return;
    const successDexes = new Set(successful.map((r) => r.dex));
    const map = latest.marketDataMap;
    const kept = latest.openOrders.filter(
      (o) => !successDexes.has(map[o.coin]?.dexId ?? '')
    );
    const fetched = successful.flatMap((r) => r.orders);
    dispatch.perps.patchState({ openOrders: [...kept, ...fetched] });
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

  async fetchMarketData(_: void | undefined, rootState: PerpsRootState) {
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
            return loadDefaultTopAssetSafe();
          }
        } catch (error) {
          console.error('Failed to fetch top assets:', error);
          return loadDefaultTopAssetSafe();
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
        return loadDefaultAssetCategorySafe();
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

      const formattedMarketData = formatMarkData(allMetas, topAssets, dexIdMap);
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
    rootState: PerpsRootState
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

    // Combined spot+perp fast price feed (supersedes the throttled
    // allDexsAssetCtxs/sac feeds). Decoded by the SDK; merged as deltas here.
    const {
      unsubscribe: unsubscribeFastAssetCtxs,
    } = sdk.ws.subscribeToFastAssetCtxs((data) => {
      dispatch.perps.mergeFastAssetCtxs(data);
    });
    subscriptions.push(unsubscribeFastAssetCtxs);
    const {
      unsubscribe: unsubscribeClearinghouseState,
    } = sdk.ws.subscribeToAllDexsClearinghouseState(address, (data) => {
      const { clearinghouseStates } = data;
      const user = (data as any).user;
      if (!isSameAddress(user, address)) {
        return;
      }
      // Drop the frame if max-time isn't newer than what we have; otherwise
      // bulk-replace in one dispatch (per-key patches would notify N times).
      const latestState = usePerpsStore.getState();
      const nextMap: Record<string, ClearinghouseState> = {};
      let frameTime = 0;
      for (const [dexName, dexState] of clearinghouseStates) {
        if (dexState) {
          nextMap[dexName] = dexState;
          if ((dexState.time ?? 0) > frameTime) {
            frameTime = dexState.time ?? 0;
          }
        }
      }
      const existingDexMap = latestState.dexClearinghouseStates || {};
      let existingFrameTime = 0;
      for (const key of Object.keys(existingDexMap)) {
        const t = existingDexMap[key]?.time ?? 0;
        if (t > existingFrameTime) existingFrameTime = t;
      }
      if (frameTime <= existingFrameTime) {
        return;
      }
      const clearinghouseState = formatAllDexsClearinghouseState(
        clearinghouseStates
      );
      if (!clearinghouseState) {
        return;
      }
      if (latestState.userAbstraction === UserAbstractionResp.unifiedAccount) {
        const perpsWithdrawable = new BigNumber(
          clearinghouseState.withdrawable || 0
        );
        clearinghouseState.perpsWithdrawable = perpsWithdrawable.toString();
        const usdcAvailable =
          latestState.spotState.balancesMap?.[getSpotBalanceKey('USDC')]
            ?.available || 0;
        clearinghouseState.withdrawable = perpsWithdrawable
          .plus(usdcAvailable)
          .toString();
      }
      dispatch.perps.patchState({ dexClearinghouseStates: nextMap });
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

        dispatch.perps.patchState({
          spotState: formatSpotState(spotState),
          isSpotStateReady: true,
        });
      }
    );
    subscriptions.push(unsubscribeSpotState);

    const { unsubscribe: unsubscribeOpenOrders } = sdk.ws.subscribeToOpenOrders(
      (data) => {
        const { orders, user } = data;
        if (!isSameAddress(user, address)) {
          return;
        }

        dispatch.perps.patchState({ openOrders: orders || [] });
      }
    );
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
            usePerpsStore.getState().soundEnabled
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
            usePerpsStore.getState().soundEnabled
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

    dispatch.perps.patchState({
      wsSubscriptions: [...rootState.perps.wsSubscriptions, ...subscriptions],
    });
  },

  // startPolling(_: void | undefined, rootState: PerpsRootState) {
  //   dispatch.perps.stopPolling(undefined);

  //   const timer = setInterval(() => {
  //     dispatch.perps.fetchClearinghouseState();
  //   }, 30 * 1000);

  //   rootState.perps.pollingTimer = timer;
  //   console.log('开始轮询ClearingHouseState, 间隔5秒');
  // },

  stopPolling(_: void | undefined, rootState: PerpsRootState) {
    if (rootState.perps.pollingTimer) {
      clearInterval(rootState.perps.pollingTimer);
      dispatch.perps.patchState({ pollingTimer: null });
      console.log('停止轮询ClearingHouseState');
    }
  },

  unsubscribeAll(_: void | undefined, rootState: PerpsRootState) {
    rootState.perps.wsSubscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (e) {
        console.error('unsubscribe error', e);
      }
    });
    dispatch.perps.patchState({ wsSubscriptions: [] });
  },

  logout() {
    dispatch.perps.stopPolling(undefined);
    dispatch.perps.unsubscribeAll(undefined);
    destroyPerpsSDK();
    dispatch.perps.resetState();
  },

  initEventBus() {
    eventBus.addEventListener(EVENTS.PERPS.LOG_OUT, () => {
      dispatch.perps.logout();
    });
    eventBus.addEventListener(EVENTS.LOCK_WALLET, () => {
      // Lock drops the SDK instance so its cached agent key / externalSign
      // signer does not survive the session.
      destroyPerpsSDK();
    });
  },

  // Desktop Pro effects
  async initFavoritedCoins(_: void | undefined, rootState: PerpsRootState) {
    try {
      const favoritedCoins = await rootState.app.wallet.getPerpsFavoritedCoins();
      dispatch.perps.setFavoritedCoins(favoritedCoins);
    } catch (error) {
      console.error('Failed to load favorited coins:', error);
    }
  },

  async initSelectedCoin(_: void | undefined, rootState: PerpsRootState) {
    try {
      const selectedCoin = await rootState.app.wallet.getPerpsSelectedCoin();
      dispatch.perps.setSelectedCoin(selectedCoin ?? 'BTC');
    } catch (error) {
      console.error('Failed to load selected coin:', error);
      dispatch.perps.setSelectedCoin('BTC');
    }
  },

  async initQuoteUnit(_: void | undefined, rootState: PerpsRootState) {
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

  async toggleFavoriteCoin(coin: string, rootState: PerpsRootState) {
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

  async initMarginModePreferences(
    _: void | undefined,
    rootState: PerpsRootState
  ) {
    try {
      const preferences = await rootState.app.wallet.getPerpsMarginModePreferences();
      dispatch.perps.setMarginModePreferences(preferences || {});
    } catch (error) {
      console.error('Failed to load margin mode preferences:', error);
    }
  },

  async setMarginModePreference(
    payload: { coin: string; mode: 'cross' | 'isolated' },
    rootState: PerpsRootState
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

  async initTpslModePreferences(
    _: void | undefined,
    rootState: PerpsRootState
  ) {
    try {
      const preferences = await rootState.app.wallet.getPerpsTpslModePreferences();
      dispatch.perps.setTpslModePreferences(
        preferences || DEFAULT_POSITION_TPSL_MODE_PREFERENCES
      );
    } catch (error) {
      console.error('Failed to load TP/SL mode preferences:', error);
      dispatch.perps.setTpslModePreferences(
        DEFAULT_POSITION_TPSL_MODE_PREFERENCES
      );
    }
  },

  async updateTpslModePreference(
    payload: { side: 'tp' | 'sl'; mode: PerpsTpslModePreference },
    rootState: PerpsRootState
  ) {
    try {
      dispatch.perps.patchTpslModePreference(payload);
      await rootState.app.wallet.setPerpsTpslModePreference(
        payload.side,
        payload.mode
      );
    } catch (error) {
      console.error('Failed to save TP/SL mode preference:', error);
    }
  },

  async initMarketSlippage(_: void | undefined, rootState: PerpsRootState) {
    try {
      const slippage = await rootState.app.wallet.getMarketSlippage();
      dispatch.perps.setMarketSlippage(slippage ?? 0.05);
    } catch (error) {
      console.error('Failed to load market slippage:', error);
      dispatch.perps.setMarketSlippage(0.05);
    }
  },

  async initSkipMarketCloseConfirm(
    _: void | undefined,
    rootState: PerpsRootState
  ) {
    try {
      const skip = await rootState.app.wallet.getSkipMarketCloseConfirm();
      dispatch.perps.setSkipMarketCloseConfirm(skip ?? false);
    } catch (error) {
      dispatch.perps.setSkipMarketCloseConfirm(false);
    }
  },

  async initSoundEnabled(_: void | undefined, rootState: PerpsRootState) {
    try {
      const soundEnabled = await rootState.app.wallet.getSoundEnabled();
      dispatch.perps.setSoundEnabled(soundEnabled ?? true);
    } catch (error) {
      console.error('Failed to load sound enabled:', error);
      dispatch.perps.setSoundEnabled(true);
    }
  },

  async updateMarketSlippage(slippage: number, rootState: PerpsRootState) {
    try {
      const clampedSlippage = Math.max(0, Math.min(1, slippage));
      dispatch.perps.setMarketSlippage(clampedSlippage);
      await rootState.app.wallet.setMarketSlippage(clampedSlippage);
    } catch (error) {
      console.error('Failed to save market slippage:', error);
    }
  },

  async updateEnabledSound(enabled: boolean, rootState: PerpsRootState) {
    try {
      await rootState.app.wallet.setSoundEnabled(enabled);
      dispatch.perps.setSoundEnabled(enabled);
    } catch (error) {
      console.error('Failed to save sound enabled:', error);
    }
  },

  async updateSkipMarketCloseConfirm(skip: boolean, rootState: PerpsRootState) {
    try {
      await rootState.app.wallet.setSkipMarketCloseConfirm(skip);
      dispatch.perps.setSkipMarketCloseConfirm(skip);
    } catch (error) {
      console.error('Failed to save skipMarketCloseConfirm:', error);
    }
  },

  async initOrderConfirmations(_: void | undefined, rootState: PerpsRootState) {
    try {
      const confirmations = await rootState.app.wallet.getPerpsOrderConfirmations();
      dispatch.perps.setOrderConfirmations(confirmations ?? {});
    } catch (error) {
      console.error('Failed to load perps order confirmations:', error);
      dispatch.perps.setOrderConfirmations(DEFAULT_PERPS_ORDER_CONFIRMATIONS);
    }
  },

  async updateOrderConfirmation(
    payload: { type: PerpsOrderConfirmType; enabled: boolean },
    rootState: PerpsRootState
  ) {
    // Apply first, persist second: these drive controlled `Switch`es, so
    // awaiting the background write would leave the toggle frozen at its old
    // value whenever that write fails — reading as a broken control.
    dispatch.perps.setOrderConfirmations({
      [payload.type]: payload.enabled,
    });
    try {
      await rootState.app.wallet.setPerpsOrderConfirmation(
        payload.type,
        payload.enabled
      );
    } catch (error) {
      console.error('Failed to save perps order confirmation:', error);
    }
  },

  async initShowPopularTradings(
    _: void | undefined,
    rootState: PerpsRootState
  ) {
    try {
      const show = await rootState.app.wallet.getPerpsShowPopularTradings();
      dispatch.perps.setShowPopularTradings(show ?? true);
    } catch (error) {
      console.error('Failed to load popular tradings setting:', error);
      dispatch.perps.setShowPopularTradings(true);
    }
  },

  async updateShowPopularTradings(show: boolean, rootState: PerpsRootState) {
    // Apply first, persist second — see updateOrderConfirmation.
    dispatch.perps.setShowPopularTradings(show);
    try {
      await rootState.app.wallet.setPerpsShowPopularTradings(show);
    } catch (error) {
      console.error('Failed to save popular tradings setting:', error);
    }
  },

  async initCandleInterval(_: void | undefined, rootState: PerpsRootState) {
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

  async updateCandleInterval(
    interval: CANDLE_MENU_KEY_V2,
    rootState: PerpsRootState
  ) {
    dispatch.perps.setCandleInterval(interval);
    try {
      await rootState.app.wallet.setPerpsCandleInterval(interval);
    } catch (error) {
      console.error('Failed to save candle interval:', error);
    }
  },
});

type PerpsReducerActions = {
  [Key in keyof typeof perpsReducers]: typeof perpsReducers[Key] extends (
    state: PerpsState,
    ...args: infer Args
  ) => PerpsState
    ? (...args: Args) => void
    : never;
};

type DropRootState<Args extends unknown[]> = Args extends [
  ...infer Payload,
  PerpsRootState
]
  ? Payload
  : Args;

type PerpsEffectImplementations = ReturnType<typeof createPerpsEffects>;

type PerpsEffectActions = {
  [Key in keyof PerpsEffectImplementations]: PerpsEffectImplementations[Key] extends (
    ...args: infer Args
  ) => infer Result
    ? (...args: DropRootState<Args>) => Result
    : never;
};

export type PerpsActions = PerpsReducerActions & PerpsEffectActions;
export type PerpsStore = PerpsState & PerpsActions;

const effectsWithRootState = new Set<keyof PerpsEffectImplementations>([
  'updateSelectedCoin',
  'updateQuoteUnit',
  'updateSizeDisplayUnit',
  'saveApproveSignatures',
  'fetchPerpPermission',
  'loginPerpsAccount',
  'fetchSingleDexClearinghouseState',
  'fetchAllDexsClearinghouseState',
  'rebuildAggregatedClearinghouseState',
  'fetchMarketData',
  'subscribeToUserData',
  'stopPolling',
  'unsubscribeAll',
  'initFavoritedCoins',
  'initSelectedCoin',
  'initQuoteUnit',
  'toggleFavoriteCoin',
  'initMarginModePreferences',
  'setMarginModePreference',
  'initTpslModePreferences',
  'updateTpslModePreference',
  'initMarketSlippage',
  'initSkipMarketCloseConfirm',
  'initSoundEnabled',
  'updateMarketSlippage',
  'updateEnabledSound',
  'updateSkipMarketCloseConfirm',
  'initOrderConfirmations',
  'updateOrderConfirmation',
  'initShowPopularTradings',
  'updateShowPopularTradings',
  'initCandleInterval',
  'updateCandleInterval',
  'fetchPerpsPortfolio',
]);

export const usePerpsStore = create<PerpsStore>()((set, get) => {
  const actionProxy = new Proxy({} as PerpsActions, {
    get(_target, property: keyof PerpsActions) {
      return (...args: unknown[]) => {
        const action = get()[property] as (...actionArgs: unknown[]) => unknown;
        return action(...args);
      };
    },
  });
  const effectImplementations = createPerpsEffects({ perps: actionProxy });

  const reducerActions = Object.fromEntries(
    Object.entries(perpsReducers).map(([name, reducer]) => {
      const runReducer = reducer as (
        state: PerpsState,
        ...args: unknown[]
      ) => PerpsState;
      return [
        name,
        (...args: unknown[]) => {
          set((state) => runReducer(state, ...args));
        },
      ];
    })
  ) as PerpsReducerActions;

  const effectActions = Object.fromEntries(
    Object.entries(effectImplementations).map(([name, effect]) => {
      const runEffect = effect as (...args: unknown[]) => unknown;
      return [
        name,
        (...args: unknown[]) => {
          if (
            effectsWithRootState.has(name as keyof PerpsEffectImplementations)
          ) {
            const effectArgs = [...args];
            while (effectArgs.length < runEffect.length - 1) {
              effectArgs.push(undefined);
            }
            return runEffect(...effectArgs, {
              app: { wallet },
              perps: get(),
            });
          }
          return runEffect(...args);
        },
      ];
    })
  ) as PerpsEffectActions;

  return {
    ...getDefaultPerpsState(),
    ...reducerActions,
    ...effectActions,
  };
});

let perpsStoreInitialized = false;

export const initializePerpsStore = () => {
  if (perpsStoreInitialized) return;
  perpsStoreInitialized = true;
  usePerpsStore.getState().initEventBus();
};

export const perpsActions: PerpsActions = new Proxy({} as PerpsActions, {
  get(_target, property: keyof PerpsActions) {
    return usePerpsStore.getState()[property];
  },
});
