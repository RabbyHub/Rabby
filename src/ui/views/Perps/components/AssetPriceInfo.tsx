import React, { useMemo } from 'react';
import clsx from 'clsx';
import { formatPercent } from '../utils';
import { splitNumberByStep } from '@/ui/utils';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { MarketData } from '@/ui/models/perps';

interface AssetPriceInfoProps {
  coin: string;
  activeAssetCtx?: WsActiveAssetCtx['ctx'] | null;
  currentAssetCtx?: MarketData | null;
}

export const AssetPriceInfo = ({
  coin,
  activeAssetCtx,
  currentAssetCtx,
}: AssetPriceInfoProps) => {
  const markPrice = useMemo(() => {
    return Number(activeAssetCtx?.markPx || currentAssetCtx?.markPx || 0);
  }, [activeAssetCtx, currentAssetCtx]);

  const dayDelta = useMemo(() => {
    const prevDayPx = Number(
      activeAssetCtx?.prevDayPx || currentAssetCtx?.prevDayPx || 0
    );
    return markPrice - prevDayPx;
  }, [activeAssetCtx, markPrice, currentAssetCtx]);

  const isPositiveChange = useMemo(() => {
    return dayDelta >= 0;
  }, [dayDelta]);

  const dayDeltaPercent = useMemo(() => {
    const prevDayPx = Number(
      activeAssetCtx?.prevDayPx || currentAssetCtx?.prevDayPx || 0
    );
    return dayDelta / prevDayPx;
  }, [activeAssetCtx, currentAssetCtx, dayDelta]);

  return (
    <div className="text-center px-20 flex flex-row items-center justify-center gap-6">
      <div className="text-13 font-medium text-r-neutral-foot">{coin}-USD</div>
      <div
        className={clsx(
          isPositiveChange ? 'text-r-green-default' : 'text-r-red-default',
          'flex items-center justify-center text-13 font-medium'
        )}
      >
        ${splitNumberByStep(markPrice)} ({isPositiveChange ? '+' : ''}
        {formatPercent(dayDeltaPercent, 2)})
      </div>
    </div>
  );
};
