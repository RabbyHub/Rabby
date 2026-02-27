import React, { useMemo } from 'react';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { ReactComponent as RcIconStar } from '@/ui/assets/perps/icon-star-filled.svg';
import { splitNumberByStep } from '@/ui/utils';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';
import { formatPerpsCoin } from '../../../utils';
interface FavoriteBarProps {
  onSelectCoin: (coin: string) => void;
}

export const FavoriteBar: React.FC<FavoriteBarProps> = ({ onSelectCoin }) => {
  const { favoritedCoins, marketDataMap } = useRabbySelector(
    (state) => state.perps
  );

  const displayCoins =
    favoritedCoins.length > 0 ? favoritedCoins : ['BTC', 'ETH', 'SOL'];

  const sortedCoins = useMemo(() => {
    return displayCoins
      .filter((coin) => Boolean(marketDataMap[coin]))
      .sort((a, b) => {
        return formatPerpsCoin(a).localeCompare(formatPerpsCoin(b));
      });
  }, [displayCoins, marketDataMap]);

  return (
    <div className="flex w-full items-center gap-[4px] px-[16px] h-40 border-b border-solid border-rb-neutral-line overflow-x-hidden bg-rb-neutral-bg-1">
      <>
        <RcIconStar className="mr-12" />

        <HorizontalScrollContainer className="flex items-center gap-[24px]">
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
                <span className="text-[12px] font-medium text-r-neutral-title-1 group-hover:text-rb-brand-default transition-colors">
                  {formatPerpsCoin(coin)}
                </span>
                <span className="text-[12px] font-medium text-r-neutral-title-1 group-hover:text-rb-brand-default transition-colors">
                  ${splitNumberByStep(Number(marketData.markPx))}
                </span>
                <span
                  className={clsx(
                    'text-[12px] font-medium',
                    isPositive ? 'text-r-green-default' : 'text-r-red-default'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </HorizontalScrollContainer>
      </>
    </div>
  );
};
