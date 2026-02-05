import { AccountHistoryItem, PositionAndOpenOrder } from '@/ui/models/perps';
import {
  UserHistoricalOrders,
  UserTwapSliceFill,
  ClearinghouseState,
} from '@rabby-wallet/hyperliquid-sdk';
import { perpsToast } from './components/PerpsToast';
import i18n from '@/i18n';
import { splitNumberByStep } from '@/ui/utils';
import { playSound } from '@/ui/utils/sound';
import BigNumber from 'bignumber.js';
import { getPerpsSDK } from '../Perps/sdkManager';
import { TokenItem } from '@/background/service/openapi';
import { CHAINS_ENUM } from '@/types/chain';
import { findChainByServerID } from '@/utils/chain';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
  ARB_USDC_TOKEN_SERVER_CHAIN,
} from '../Perps/constants';

export const getPositionDirection = (
  position: PositionAndOpenOrder['position']
): 'Long' | 'Short' => {
  return Number(position.szi || 0) > 0 ? 'Long' : 'Short';
};

export const handleUpdateHistoricalOrders = (
  historicalOrders: UserHistoricalOrders[],
  enableSound: boolean
) => {
  const changeOrderLen = historicalOrders.length;
  if (changeOrderLen > 1) {
    return;
  }

  const item = historicalOrders[0];

  let percent = 0;
  if (item.order.orderType === 'Limit' && item.status === 'filled') {
    const { sz } = item.order;
    if (Number(sz) === 0) {
      percent = 100;
    } else {
      percent = Math.round((Number(sz) / Number(item.order.origSz)) * 100);
    }
    const isBuy = item.order.side === 'B';
    perpsToast.success({
      title: i18n.t('page.perps.toast.limitOrderFilled', {
        percent,
      }),
      description: i18n.t(
        isBuy
          ? 'page.perps.toast.buyFilledContent'
          : 'page.perps.toast.sellFilledContent',
        {
          sz: Number(item.order.sz) || Number(item.order.origSz),
          origSz: Number(item.order.origSz),
          coin: item.order.coin,
          price: splitNumberByStep(item.order.limitPx),
        }
      ),
    });
    if (enableSound) {
      playSound('/sounds/order-filled.mp3');
    }
  }
};

export const handleUpdateTwapSliceFills = (
  twapSliceFills: UserTwapSliceFill[],
  enableSound: boolean
) => {
  const item = twapSliceFills[0];
  const isBuy = item.fill.side === 'B';
  perpsToast.success({
    title: i18n.t('page.perps.toast.twapSliceFilled'),
    description: i18n.t(
      isBuy
        ? 'page.perps.toast.buyFilledContentNoPercentage'
        : 'page.perps.toast.sellFilledContentNoPercentage',
      {
        sz: Number(item.fill.sz),
        coin: item.fill.coin,
        price: splitNumberByStep(item.fill.px),
      }
    ),
  });
  if (enableSound) {
    playSound('/sounds/order-filled.mp3');
  }
};

export const showDepositAndWithdrawToast = (item: AccountHistoryItem) => {
  const isDeposit = item.type === 'deposit' || item.type === 'receive';
  perpsToast.success({
    title: i18n.t(
      isDeposit ? 'page.perps.toast.deposit' : 'page.perps.toast.withdraw'
    ),
    description: i18n.t(
      isDeposit
        ? 'page.perps.toast.depositTip'
        : 'page.perps.toast.withdrawTip',
      {
        amount: item.usdValue,
      }
    ),
  });
};

/**
 * Hyperliquid Perps Tick Calculation (Pure Contract Mode)
 */

export interface TickOption {
  displayPrice: number; // UI 显示的值 (e.g. 0.000001)
  nSigFigs: 2 | 3 | 4 | 5; // API 请求参数
  mantissa: 1 | 2 | 5 | null; // API 请求参数 (仅 nSigFigs=5 时存在)
}

const PERP_MAX_DECIMALS_GLOBAL = 6;

/**
 * calc the valid tick options
 * @param currentPrice  current price (must, for calculating the valid digits)
 * @param szDecimals   szDecimals in API meta (must, for calculating the max allowed decimals)
 */
export function getPerpTickOptions(
  currentPrice: number,
  szDecimals: number
): TickOption[] {
  if (currentPrice <= 0) return [];

  const options: TickOption[] = [];

  // 1. calc the max allowed decimals
  // no more than 6 - szDecimals
  // if szDecimals is 0 (kPEPE), limit = 6
  const maxAllowedDecimals = Math.max(0, PERP_MAX_DECIMALS_GLOBAL - szDecimals);

  // 2. calc the magnitude of the current price
  // e.g. 3133.1 -> 3;  0.0059 -> -3
  const magnitude = Math.floor(Math.log10(currentPrice));

  // 3. start from the finest nSigFigs=5 and traverse down to 2
  for (let sigFigs = 5; sigFigs >= 2; sigFigs--) {
    // calc the base tick for the given sigFigs
    // Formula: 10 ^ (Mag - SigFigs + 1)
    const exponent = magnitude - sigFigs + 1;

    if (-exponent > maxAllowedDecimals) {
      continue;
    }

    const baseTick = Math.pow(10, exponent);

    if (sigFigs === 5) {
      options.push(createOption(baseTick * 1, 5, null)); // x1
      options.push(createOption(baseTick * 2, 5, 2)); // x2
      options.push(createOption(baseTick * 5, 5, 5)); // x5
    } else {
      options.push(createOption(baseTick, sigFigs as 2 | 3 | 4 | 5, null));
    }
  }

  return options;
}

function createOption(
  val: number,
  nSig: 2 | 3 | 4 | 5,
  man: 1 | 2 | 5 | null
): TickOption {
  const cleanVal = parseFloat(val.toPrecision(10));
  return { displayPrice: cleanVal, nSigFigs: nSig, mantissa: man };
}

export const isScreenSmall = () => {
  return window.innerWidth < 1680;
};

export const handleDisplayFundingPayments = (fundingPayments: string) => {
  const bn = new BigNumber(fundingPayments || 0);
  if (bn.isZero()) {
    return '$0.00';
  }
  const sign = bn.isNegative() ? '-' : '';
  if (bn.abs().lt(0.01)) {
    return sign + '$0.01';
  }

  return sign + '$' + bn.abs().toFixed(2);
};

export const formatPerpsCoin = (coin: string) => {
  if (coin.includes(':')) {
    // is hip-3 coin
    return coin.split(':')[1];
  } else {
    return coin;
  }
};

const STATUS_ENUM = {
  FILLED: 'filled',
  OPEN: 'open',
  TRIGGERED: 'triggered',
  CANCELED: 'canceled',
  PERP_MARGIN_REJECTED: 'perpMarginRejected',
  REDUCE_ONLY_CANCELED: 'reduceOnlyCanceled',
  MIN_TRADE_NTL_REJECTED: 'minTradeNtlRejected',
  IOC_CANCEL_REJECTED: 'iocCancelRejected',
  BAD_ALO_PX_REJECTED: 'badAloPxRejected',
};

export const formatPerpsOrderStatus = (record: UserHistoricalOrders) => {
  const { status } = record;
  let statusStr = '';
  let tipsStr = '';
  const isPartiallyFilled =
    Number(record.order.sz) !== 0 &&
    Number(record.order.sz) < Number(record.order.origSz);
  switch (status) {
    case STATUS_ENUM.OPEN:
      statusStr = i18n.t('page.perpsPro.userInfo.status.open');
      tipsStr = '';
      break;
    case STATUS_ENUM.FILLED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.filled');
      tipsStr = isPartiallyFilled
        ? i18n.t('page.perpsPro.userInfo.status.partiallyFilledTip')
        : '';
      break;
    case STATUS_ENUM.TRIGGERED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.triggered');
      tipsStr = '';
      break;
    case STATUS_ENUM.CANCELED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.canceled');
      tipsStr = '';
      break;
    case STATUS_ENUM.PERP_MARGIN_REJECTED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.rejected');
      tipsStr = i18n.t('page.perpsPro.userInfo.status.perpMarginRejected');
      break;
    case STATUS_ENUM.REDUCE_ONLY_CANCELED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.canceled');
      tipsStr = i18n.t('page.perpsPro.userInfo.status.reduceOnlyCanceled');
      break;
    case STATUS_ENUM.MIN_TRADE_NTL_REJECTED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.rejected');
      tipsStr = i18n.t('page.perpsPro.userInfo.status.minTradeNtlRejected');
      break;
    case STATUS_ENUM.IOC_CANCEL_REJECTED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.rejected');
      tipsStr = i18n.t('page.perpsPro.userInfo.status.iocCancelRejected');
      break;
    case STATUS_ENUM.BAD_ALO_PX_REJECTED:
      statusStr = i18n.t('page.perpsPro.userInfo.status.rejected');
      tipsStr = i18n.t('page.perpsPro.userInfo.status.badAloPxRejected');
      break;
    default:
      statusStr = status;
      tipsStr = '';
      break;
  }
  return {
    statusStr,
    tipsStr,
  };
};

export const getCustomClearinghouseState = async (address: string) => {
  const sdk = getPerpsSDK();
  const getDefault = async () => {
    const res = await sdk.info.getClearingHouseState(address);
    return res;
  };
  const getXYX = async () => {
    const res = await sdk.info.getClearingHouseState(address, 'xyz');
    return res;
  };
  const [defaultRes, xyzRes] = await Promise.all([getDefault(), getXYX()]);

  return {
    assetPositions: [...defaultRes.assetPositions, ...xyzRes.assetPositions],
    crossMaintenanceMarginUsed: new BigNumber(
      defaultRes.crossMaintenanceMarginUsed
    )
      .plus(xyzRes.crossMaintenanceMarginUsed)
      .toString(),
    crossMarginSummary: defaultRes.crossMarginSummary,
    marginSummary: {
      accountValue: new BigNumber(defaultRes.marginSummary.accountValue)
        .plus(xyzRes.marginSummary.accountValue)
        .toString(),
      totalMarginUsed: new BigNumber(defaultRes.marginSummary.totalMarginUsed)
        .plus(xyzRes.marginSummary.totalMarginUsed)
        .toString(),
      totalNtlPos: new BigNumber(defaultRes.marginSummary.totalNtlPos)
        .plus(xyzRes.marginSummary.totalNtlPos)
        .toString(),
      totalRawUsd: new BigNumber(defaultRes.marginSummary.totalRawUsd)
        .plus(xyzRes.marginSummary.totalRawUsd)
        .toString(),
    },
    time: defaultRes.time,
    withdrawable: defaultRes.withdrawable,
  } as ClearinghouseState;
};

export const sortTokenList = (
  tokenList: TokenItem[],
  supportedChains: CHAINS_ENUM[]
) => {
  const items = [...(tokenList || [])];

  // Sort by amount * price (descending)
  items.sort((a, b) => {
    const aValue = b.amount * b.price;
    const bValue = a.amount * a.price;

    // Check if tokens are in supported chains
    const aChain = findChainByServerID(a.chain)?.enum || CHAINS_ENUM.ETH;
    const bChain = findChainByServerID(b.chain)?.enum || CHAINS_ENUM.ETH;
    const aIsSupported = supportedChains.includes(aChain);
    const bIsSupported = supportedChains.includes(bChain);

    // Supported chains first, then by value
    if (aIsSupported && !bIsSupported) return -1;
    if (!aIsSupported && bIsSupported) return 1;

    // Both supported or both not supported, sort by value
    return aValue - bValue;
  });

  // Move ARB USDC to the front if it exists
  const idx = items.findIndex(
    (token) =>
      token.id === ARB_USDC_TOKEN_ID &&
      token.chain === ARB_USDC_TOKEN_SERVER_CHAIN
  );
  if (idx > 0) {
    const [hit] = items.splice(idx, 1);
    items.unshift(hit);
  } else if (idx === -1) {
    items.unshift(ARB_USDC_TOKEN_ITEM);
  }
  return items;
};

const calcAccountValueByAllDexs = (
  allClearinghouseState: [string, ClearinghouseState][]
) => {
  return allClearinghouseState.reduce((acc, item) => {
    return acc + Number(item[1]?.marginSummary?.accountValue || 0);
  }, 0);
};

export const formatAllDexsClearinghouseState = (
  allClearinghouseState: [string, ClearinghouseState][]
): ClearinghouseState | null => {
  if (!allClearinghouseState || !allClearinghouseState[0]) {
    return null;
  }
  const hyperDexState = allClearinghouseState[0][1];

  const assetPositions = allClearinghouseState
    .map((item) => item[1]?.assetPositions || [])
    .flat();

  const withdrawable = allClearinghouseState.reduce((acc, item) => {
    return acc + Number(item[1]?.withdrawable || 0);
  }, 0);

  return {
    assetPositions: assetPositions,
    crossMaintenanceMarginUsed:
      hyperDexState?.crossMaintenanceMarginUsed || '0',
    crossMarginSummary: hyperDexState?.crossMarginSummary || {},
    marginSummary: {
      ...hyperDexState.marginSummary,
      accountValue: calcAccountValueByAllDexs(allClearinghouseState).toString(),
    },
    time: hyperDexState?.time || 0,
    withdrawable: withdrawable.toString(),
  };
};
