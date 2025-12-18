import React from 'react';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { ReactComponent as RcIconStar } from '@/ui/assets/perps/icon-star-filled.svg';
import { splitNumberByStep } from '@/ui/utils';

interface FavoriteBarProps {
  onSelectCoin: (coin: string) => void;
}

export const FavoriteBar: React.FC<FavoriteBarProps> = ({ onSelectCoin }) => {
  const { favoritedCoins, selectedCoin, marketDataMap } = useRabbySelector(
    (state) => state.perps
  );

  const displayCoins =
    favoritedCoins.length > 0 ? favoritedCoins : ['BTC', 'ETH', 'SOL'];

  const sortedCoins = displayCoins.sort((a, b) => {
    return a.localeCompare(b);
  });

  return (
    <div className="flex items-center gap-[16px] px-[16px] py-[14px] border-b border-solid border-rb-neutral-line overflow-x-auto bg-rb-neutral-bg-1">
      <>
        <RcIconStar />
        {sortedCoins.map((coin) => {
          const marketData = marketDataMap[coin];
          if (!marketData) return null;
          const priceChange = marketData.prevDayPx
            ? ((Number(marketData.markPx) - Number(marketData.prevDayPx)) /
                Number(marketData.prevDayPx)) *
              100
            : 0;
          const isPositive = priceChange >= 0;

          return (
            <div
              key={coin}
              className="group flex items-center gap-[4px] cursor-pointer flex-shrink-0"
              onClick={() => onSelectCoin(coin)}
            >
              <span className="text-[13px] font-medium text-r-neutral-title-1 group-hover:text-rb-brand-default transition-colors">
                {coin}:
              </span>
              <span className="text-[13px] font-medium text-r-neutral-title-1 group-hover:text-rb-brand-default transition-colors">
                ${splitNumberByStep(Number(marketData.markPx))}
              </span>
              <span
                className={clsx(
                  'text-[13px] font-medium',
                  isPositive ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {isPositive ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </>
    </div>
  );
};
