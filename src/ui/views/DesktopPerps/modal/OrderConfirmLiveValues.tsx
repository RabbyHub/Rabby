import React from 'react';
import BigNumber from 'bignumber.js';
import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { formatPerpsCoin } from '../utils';
import { formatLiquidationDistance } from '../liquidationDistance';
import { usePerpsTradingState } from '../hooks/usePerpsTradingState';
import { resolveTpSlTrigger, resolveTriggerComparator } from '../tpslTrigger';

/**
 * Row values that must keep ticking while the confirmation dialog is open.
 *
 * The dialog freezes the order payload at click time so what is shown is what
 * gets sent. These cells are the exceptions — each one is a number the panel
 * behind the dialog already updates live, so freezing it would show a figure
 * that has visibly gone stale. They are components rather than strings so they
 * subscribe on their own: `OrderConfirmRow.value` takes a ReactNode, so the
 * frozen snapshot can still carry a live cell.
 */

/**
 * `fallback` is the caller's mark price at click time. Passing it in rather
 * than reading `marketDataMap` here keeps this off the high-churn map for what
 * is a single-coin lookup; the ws context alone is enough to stay current.
 */
export const LiveMarkPrice: React.FC<{
  coin: string;
  fallback: number;
  pxDecimals: number;
  quoteAsset: string;
}> = ({ coin, fallback, pxDecimals, quoteAsset }) => {
  const wsActiveAssetCtx = useRabbySelector((s) => s.perps.wsActiveAssetCtx);

  const live =
    wsActiveAssetCtx && wsActiveAssetCtx.coin === coin
      ? Number(wsActiveAssetCtx.ctx.markPx || 0)
      : 0;
  const price = live > 0 ? live : fallback;

  if (!(price > 0)) return <>-</>;
  return <>{`${splitNumberByStep(price.toFixed(pxDecimals))} ${quoteAsset}`}</>;
};

/**
 * Size rendered in whichever unit the panel is currently set to, mirroring
 * `OrderInfoGrid`'s conversion. `amount` is always the base-asset size that
 * will actually be submitted — only its presentation changes.
 */
export const ConfirmAmount: React.FC<{
  amount: string;
  coin: string;
  price: number | string;
  quoteAsset: string;
}> = ({ amount, coin, price, quoteAsset }) => {
  const sizeDisplayUnit = useRabbySelector((s) => s.perps.sizeDisplayUnit);

  if (sizeDisplayUnit === 'usd' && price && Number(amount) > 0) {
    return (
      <>{`${splitNumberByStep(
        new BigNumber(amount).multipliedBy(price).toFixed(2)
      )} ${quoteAsset}`}</>
    );
  }
  return <>{`${splitNumberByStep(amount)} ${formatPerpsCoin(coin)}`}</>;
};

/**
 * Liquidation price and its distance from the mark price.
 *
 * Both track the market, but for different reasons. A market order's entry is
 * the mark price, so its liquidation price moves too and `orderPrice` is left
 * undefined to let `calcDirectionInfo` default to the live mark. A limit
 * order's entry is the price the user typed, so its liquidation price is fixed
 * — only the distance moves, because that is measured against the mark.
 *
 * `calcDirectionInfo` comes from the same hook the panel uses, so this cannot
 * drift from the numbers the panel shows and no liquidation math is duplicated.
 */
export const LiveLiquidation: React.FC<{
  direction: 'Long' | 'Short';
  size: string;
  /** Omit for market orders so the liquidation price follows the mark price. */
  orderPrice?: string;
  pxDecimals: number;
  variant: 'price' | 'distance';
}> = ({ direction, size, orderPrice, pxDecimals, variant }) => {
  const { calcDirectionInfo, markPrice } = usePerpsTradingState({
    readOnly: true,
  });

  const { liqPrice, liqPriceNum } = calcDirectionInfo(
    direction,
    size,
    orderPrice
  );

  // Whether the row exists at all was decided at click time. If a fill lands
  // while the dialog is open the position can net to zero and leave nothing to
  // show — render the same placeholder `calcDirectionInfo` uses rather than
  // nothing, which would leave the row's label stranded beside an empty value.
  if (!liqPrice || liqPrice === '-' || !liqPriceNum) return <>-</>;
  if (variant === 'price') return <>{liqPrice}</>;

  const distance = formatLiquidationDistance(
    liqPriceNum,
    markPrice,
    pxDecimals
  );
  return <>{distance || '-'}</>;
};

/**
 * A TP/SL trigger for an order that has not been placed yet.
 *
 * In `pnl`/`roi` mode the panel re-derives the trigger from the order price as
 * it streams, so the value shown at click time goes stale within seconds. This
 * reads the same `tpslConfig` the panel writes; the submit path resolves the
 * trigger the same way at send time, so the two agree.
 */
export const LiveTpSlTrigger: React.FC<{
  side: 'tp' | 'sl';
  isBuy: boolean;
  quoteAsset: string;
  markPriceLabel: string;
}> = ({ side, isBuy, quoteAsset, markPriceLabel }) => {
  const { tpslConfig } = usePerpsTradingState({ readOnly: true });

  const item = side === 'tp' ? tpslConfig.takeProfit : tpslConfig.stopLoss;
  const trigger = resolveTpSlTrigger(item, isBuy);
  // The row was gated in at click time; a placeholder keeps its label company
  // if the derived trigger ever drops out from under it.
  if (!trigger || !(Number(trigger) > 0)) return <>-</>;

  const comparator = resolveTriggerComparator(isBuy, side === 'tp');
  return (
    <>{`${markPriceLabel}${comparator}${splitNumberByStep(
      trigger
    )} ${quoteAsset}`}</>
  );
};
