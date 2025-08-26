import React from 'react';
import clsx from 'clsx';
import { AssetPosition } from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValue } from '@/ui/utils';
import { MarketData } from '@/ui/models/perps';
const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export const PositionItem: React.FC<{
  position: AssetPosition['position'];
  marketData?: MarketData;
  onClick?: () => void;
}> = ({ position, onClick, marketData }) => {
  const {
    coin,
    szi,
    leverage,
    positionValue,
    marginUsed,
    unrealizedPnl,
    returnOnEquity,
    liquidationPx,
    entryPx,
  } = position;
  const isUp = Number(unrealizedPnl) >= 0;

  const sign = isUp ? '+' : '-';
  const side =
    Number(liquidationPx || 0) < Number(entryPx || 0) ? 'Long' : 'Short';
  const absPnlUsd = Math.abs(Number(unrealizedPnl));
  const absPnlPct = Math.abs(Number(returnOnEquity));
  const pnlText = `${sign}${formatUsdValue(absPnlUsd)} (${sign}${formatPct(
    absPnlPct
  )})`;
  const logoUrl = marketData?.logoUrl || '';
  const leverageText = `${leverage.value}x`;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'w-full bg-r-neutral-card1 rounded-[12px] px-16 py-12 flex items-center justify-between',
        'border border-transparent',
        'hover:border-rabby-blue-default cursor-pointer'
      )}
    >
      <div className="flex items-center gap-12">
        <img src={logoUrl} alt={coin} className="w-32 h-32 rounded-full mr-4" />
        <div className="text-left">
          <div className="text-15 font-medium text-r-neutral-title-1 mb-2">
            {coin} - USD
          </div>
          <div className="text-13 text-r-neutral-foot">
            {side} {leverageText}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-15 font-medium  text-r-neutral-title-1 mb-2">
          {formatUsdValue(Number(marginUsed))}
        </div>
        <div
          className={clsx(
            'text-13 font-medium ',
            isUp ? 'text-r-green-default' : 'text-r-red-default'
          )}
        >
          {pnlText}
        </div>
      </div>
    </div>
  );
};

export default PositionItem;
