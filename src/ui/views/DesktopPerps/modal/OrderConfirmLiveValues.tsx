import React from 'react';
import BigNumber from 'bignumber.js';
import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { formatPerpsCoin } from '../utils';

/**
 * Row values that must keep ticking while the confirmation dialog is open.
 *
 * The dialog freezes the order payload at click time so what is shown is what
 * gets sent. These two are the exceptions: neither is part of the payload.
 * Mark price is a live reference the user reads to judge the order, and the
 * size unit is a global display preference. Both are rendered as components so
 * they subscribe on their own — `OrderConfirmRow.value` takes a ReactNode, so
 * the frozen snapshot can still carry a live cell.
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

  if (!(price > 0)) return null;
  return (
    <>{`${splitNumberByStep(price.toFixed(pxDecimals))} ${quoteAsset}`}</>
  );
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
