import { AccountHistoryItem, PositionAndOpenOrder } from '@/ui/models/perps';
import {
  UserHistoricalOrders,
  UserTwapSliceFill,
} from '@rabby-wallet/hyperliquid-sdk';
import { perpsToast } from './components/PerpsToast';
import i18n from '@/i18n';
import { splitNumberByStep } from '@/ui/utils';
import { playSound } from '@/ui/utils/sound';
import BigNumber from 'bignumber.js';

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

  return sign + '$' + bn.toFixed(2);
};
