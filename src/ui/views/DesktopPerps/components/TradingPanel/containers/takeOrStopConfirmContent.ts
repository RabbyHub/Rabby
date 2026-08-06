import React from 'react';
import type { TFunction } from 'i18next';
import { splitNumberByStep } from '@/ui/utils';
import { formatPerpsCoin } from '../../../utils';
import {
  ConfirmAmount,
  LiveMarkPrice,
} from '../../../modal/OrderConfirmLiveValues';
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
   * limit price for the conditional-limit one.
   */
  priceText: string;
  /** Mark price at click time; only the starting value for the live cell. */
  markPrice: number;
  pxDecimals: number;
  /** Direction-specific trade size in base units, exactly as submitted. */
  amount: string;
  /**
   * Price used solely to convert `amount` when the panel's size unit is USD —
   * whatever the container's size input converts with, so the dialog shows back
   * the same figure the user typed.
   */
  amountPrice: number;
  /**
   * The two liquidation cells, passed in rather than computed here: both track
   * the market while the dialog is open, and how they track it differs between
   * the market and limit containers. Omit either one to drop its row.
   */
  liqPriceCell?: React.ReactNode;
  liqDistanceCell?: React.ReactNode;
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
  amountPrice,
  liqPriceCell,
  liqDistanceCell,
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
      value: React.createElement(LiveMarkPrice, {
        coin: selectedCoin,
        fallback: markPrice,
        pxDecimals,
        quoteAsset,
      }),
    });
  }

  if (amount && Number(amount) > 0) {
    rows.push({
      key: 'amount',
      label: t('page.perpsPro.orderConfirm.amount'),
      value: React.createElement(ConfirmAmount, {
        amount,
        coin: selectedCoin,
        price: amountPrice,
        quoteAsset,
      }),
    });
  }

  if (liqPriceCell) {
    rows.push({
      key: 'estLiqPrice',
      label: t('page.perpsPro.orderConfirm.estLiqPrice'),
      value: liqPriceCell,
    });
  }

  if (liqDistanceCell) {
    rows.push({
      key: 'estLiqDistance',
      label: t('page.perpsPro.orderConfirm.estLiqDistance'),
      value: liqDistanceCell,
    });
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
