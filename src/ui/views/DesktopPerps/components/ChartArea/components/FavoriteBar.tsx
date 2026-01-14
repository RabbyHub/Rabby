import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { ReactComponent as RcIconStar } from '@/ui/assets/perps/icon-star-filled.svg';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { splitNumberByStep } from '@/ui/utils';

interface FavoriteBarProps {
  onSelectCoin: (coin: string) => void;
}

export const FavoriteBar: React.FC<FavoriteBarProps> = ({ onSelectCoin }) => {
  const { favoritedCoins, selectedCoin, marketDataMap } = useRabbySelector(
    (state) => state.perps
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const displayCoins =
    favoritedCoins.length > 0 ? favoritedCoins : ['BTC', 'ETH', 'SOL'];

  const sortedCoins = useMemo(() => {
    return displayCoins
      .filter((coin) => Boolean(marketDataMap[coin]))
      .sort((a, b) => {
        return a.localeCompare(b);
      });
  }, [displayCoins, marketDataMap]);

  const checkScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Check scroll buttons on mount and when coins change
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    const rafId = requestAnimationFrame(() => {
      checkScrollButtons();
    });
    return () => cancelAnimationFrame(rafId);
  }, [checkScrollButtons, sortedCoins.length]);

  // Add scroll and resize listeners
  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollButtons);
      }
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [checkScrollButtons]);

  const handleScrollLeft = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
  };

  return (
    <div className="flex w-full items-center gap-[4px] px-[16px] h-40 border-b border-solid border-rb-neutral-line overflow-x-hidden bg-rb-neutral-bg-1">
      <>
        <RcIconStar className="mr-12" />

        {/* Left Arrow */}
        {canScrollLeft && (
          <div
            className="flex-shrink-0 flex items-center justify-center w-20 h-20 cursor-pointer text-r-neutral-foot hover:text-r-neutral-title-1"
            onClick={handleScrollLeft}
          >
            <RcIconArrowDownCC className="text-rb-neutral-secondary rotate-90" />
          </div>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex-1 flex gap-24 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
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
                  {coin}
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
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <div
            className="flex-shrink-0 flex items-center justify-center w-20 h-20 cursor-pointer text-r-neutral-foot hover:text-r-neutral-title-1"
            onClick={handleScrollRight}
          >
            <RcIconArrowDownCC className="text-rb-neutral-secondary -rotate-90" />
          </div>
        )}
      </>
    </div>
  );
};
