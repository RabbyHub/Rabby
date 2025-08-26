import { MarketData } from '@/ui/models/perps';
import { formatUsdValue } from '@/ui/utils/number';
import clsx from 'clsx';
import React from 'react';
import { useHistory } from 'react-router-dom';
const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export const AssetItem: React.FC<{
  item: MarketData;
}> = ({ item }) => {
  const isUp = Number(item.markPx) - Number(item.prevDayPx) > 0;
  const history = useHistory();
  const absPnlUsd = Math.abs(Number(item.markPx) - Number(item.prevDayPx));
  const absPnlPct = Math.abs(absPnlUsd / Number(item.prevDayPx));
  const pnlText = `${isUp ? '+' : '-'}${formatPct(absPnlPct)}`;

  return (
    <div
      className="
        flex items-center justify-between cursor-pointer
        hover:bg-r-blue-light-1 px-16 py-12
        rounded-[8px]
        border-[1px]
        border-solid
        border-transparent
        hover:border-rabby-blue-default 
      "
      onClick={() => {
        history.push(`/perps/single-coin/${item.name}`);
      }}
    >
      <div className="flex items-center gap-12">
        <img
          src={item.logoUrl}
          alt={item.name}
          className="w-32 h-32 rounded-full mr-4"
        />
        <div className="text-left">
          <div className="text-15 font-medium text-r-neutral-title-1 mb-2">
            {item.name} - USD
          </div>
          <div className="text-13 text-r-neutral-foot">{item.maxLeverage}x</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-15 font-medium  text-r-neutral-title-1 mb-2">
          {`$${item.markPx}`}
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
