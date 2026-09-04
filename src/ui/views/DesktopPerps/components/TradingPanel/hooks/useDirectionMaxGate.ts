import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import type { PositionSize } from '../../../types';
import perpsToast from '../../PerpsToast';
import { exceedsDirectionMax } from '../utils';

/**
 * Click-time gate for the per-direction max trade size.
 *
 * With a position open the closing direction's max includes the closable size,
 * so buy and sell gate on different maxes. Enforced with a toast at click time
 * instead of disabling the button — a disabled pair plus the shared banner
 * would read as "neither side affordable" when only one side exceeds its max.
 *
 * Returns a checker for the click handler: `false` means the order was blocked
 * and toasted, `true` means proceed.
 */
export const useDirectionMaxGate = ({
  positionSize,
  maxBuyTradeSize,
  maxSellTradeSize,
}: {
  positionSize: PositionSize;
  maxBuyTradeSize: string | number | undefined;
  maxSellTradeSize: string | number | undefined;
}) => {
  const { t } = useTranslation();
  const buyMaxExceeded = exceedsDirectionMax(positionSize, maxBuyTradeSize);
  const sellMaxExceeded = exceedsDirectionMax(positionSize, maxSellTradeSize);
  return useMemoizedFn((isBuy: boolean) => {
    if (isBuy ? buyMaxExceeded : sellMaxExceeded) {
      perpsToast.error({
        title: t('page.perps.toast.orderError'),
        description: t('page.perpsPro.tradingPanel.insufficientBalance'),
      });
      return false;
    }
    return true;
  });
};
