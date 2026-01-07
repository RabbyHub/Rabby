import { PositionAndOpenOrder } from '@/ui/models/perps';
import {
  UserHistoricalOrders,
  UserTwapSliceFill,
} from '@rabby-wallet/hyperliquid-sdk';
import { perpsToast } from './components/PerpsToast';
import i18n from '@/i18n';
import { splitNumberByStep } from '@/ui/utils';
import { playSound } from '@/ui/utils/sound';

export const getPositionDirection = (
  position: PositionAndOpenOrder['position']
): 'Long' | 'Short' => {
  return Number(position.szi || 0) > 0 ? 'Long' : 'Short';
};

export const handleUpdateHistoricalOrders = (
  historicalOrders: UserHistoricalOrders[]
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
    playSound('/sounds/order-filled.mp3');
  }
};

export const handleUpdateTwapSliceFills = (
  twapSliceFills: UserTwapSliceFill[]
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
  playSound('/sounds/order-filled.mp3');
};
