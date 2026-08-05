import type { TFunction } from 'i18next';
import { splitNumberByStep } from '@/ui/utils';
import { formatPerpsPct } from '@/ui/views/Perps/utils';
import { formatPerpsCoin } from '../../../utils';
import type { OrderConfirmRow } from '../../../modal/OrderConfirmModal';
import type { OrderConfirmContent } from '../../../modal/OrderConfirmProvider';

export interface TakeOrStopConfirmParams {
  t: TFunction;
  isBuy: boolean;
  selectedCoin: string;
  quoteAsset: string;
  /** Raw trigger price the user typed. */
  triggerPrice: string;
  /**
   * The `Price` cell: `Market Price` for the conditional-market container, the
   * direction's limit price for the conditional-limit one.
   */
  priceText: string;
  markPrice: number;
  pxDecimals: number;
  /** Direction-specific trade size in base units, exactly as submitted. */
  amount: string;
  /**
   * This direction's liquidation price as a number (`liqPriceNum` on
   * `OrderSideInfo`); `null` when there is none to show.
   */
  estLiqPrice?: number | null;
  reduceOnly: boolean;
}

/**
 * Builds the conditional-order confirmation body shared by the take-profit /
 * stop-loss market and limit containers. Same shape for `tp` and `sl`.
 */
export const buildTakeOrStopConfirmContent = ({
  t,
  isBuy,
  selectedCoin,
  quoteAsset,
  triggerPrice,
  priceText,
  markPrice,
  pxDecimals,
  amount,
  estLiqPrice,
  reduceOnly,
}: TakeOrStopConfirmParams): OrderConfirmContent => {
  const rows: OrderConfirmRow[] = [];

  if (triggerPrice && Number(triggerPrice) > 0) {
    rows.push({
      key: 'triggerPrice',
      label: t('page.perpsPro.orderConfirm.triggerPrice'),
      value: `${splitNumberByStep(triggerPrice)} ${quoteAsset}`,
    });
  }

  if (priceText) {
    rows.push({
      key: 'price',
      label: t('page.perpsPro.orderConfirm.price'),
      value: priceText,
    });
  }

  if (markPrice > 0) {
    rows.push({
      key: 'markPrice',
      label: t('page.perpsPro.orderConfirm.markPrice'),
      value: `${splitNumberByStep(
        markPrice.toFixed(pxDecimals)
      )} ${quoteAsset}`,
    });
  }

  if (amount && Number(amount) > 0) {
    rows.push({
      key: 'amount',
      label: t('page.perpsPro.orderConfirm.amount'),
      value: `${amount} ${formatPerpsCoin(selectedCoin)}`,
    });
  }

  if (estLiqPrice) {
    rows.push({
      key: 'estLiqPrice',
      label: t('page.perpsPro.orderConfirm.estLiqPrice'),
      value: `${splitNumberByStep(
        estLiqPrice.toFixed(pxDecimals)
      )} ${quoteAsset}`,
    });

    if (markPrice > 0) {
      const delta = estLiqPrice - markPrice;
      rows.push({
        key: 'estLiqDistance',
        label: t('page.perpsPro.orderConfirm.estLiqDistance'),
        value: `${formatPerpsPct(delta / markPrice)}(${splitNumberByStep(
          delta.toFixed(pxDecimals)
        )})`,
      });
    }
  }

  rows.push({
    key: 'reduceOnly',
    label: t('page.perpsPro.orderConfirm.reduceOnly'),
    value: reduceOnly
      ? t('page.perpsPro.orderConfirm.true')
      : t('page.perpsPro.orderConfirm.false'),
  });

  return {
    title: `${formatPerpsCoin(selectedCoin)}-${quoteAsset}`,
    titleSuffix: {
      text: isBuy
        ? t('page.perpsPro.orderConfirm.buyLong')
        : t('page.perpsPro.orderConfirm.sellShort'),
      tone: isBuy ? 'up' : 'down',
    },
    sections: [{ key: 'main', rows }],
  };
};

export default buildTakeOrStopConfirmContent;
