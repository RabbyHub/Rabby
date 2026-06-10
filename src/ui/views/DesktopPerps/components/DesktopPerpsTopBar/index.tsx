import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { ReactComponent as RcIconTopBarLogo } from '@/ui/assets/perps/IconPerpsTopBarLogo.svg';
import { ReactComponent as RcIconOverflowArrow } from '@/ui/assets/perps/IconPerpsTopBarOverflowArrow.svg';
import { ReactComponent as RcIconStar } from '@/ui/assets/perps/icon-star-filled.svg';
import usePerpsProState from '../../hooks/usePerpsProState';
import { formatPerpsCoin } from '../../utils';
import { AccountActions } from '../AccountActions';

const FAVORITES_SCROLL_STEP = 320;

const getPriceChangePercent = (markPx?: string, prevDayPx?: string) => {
  const mark = Number(markPx || 0);
  const prev = Number(prevDayPx || 0);
  if (!mark || !prev) return 0;
  return ((mark - prev) / prev) * 100;
};

export const DesktopPerpsTopBar: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const { login: switchPerpsAccount } = usePerpsProState();
  const favoritesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const {
    currentPerpsAccount,
    favoritedCoins,
    marketDataMap,
  } = useRabbySelector((state) => state.perps);

  const sortedCoins = useMemo(() => {
    return favoritedCoins
      .filter((coin) => Boolean(marketDataMap[coin]))
      .sort((a, b) => formatPerpsCoin(a).localeCompare(formatPerpsCoin(b)));
  }, [favoritedCoins, marketDataMap]);

  const isEmpty = sortedCoins.length === 0;

  const updateCanScrollRight = useCallback(() => {
    const container = favoritesScrollRef.current;
    if (!container) {
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    if (isEmpty) {
      setCanScrollRight(false);
      return;
    }

    const container = favoritesScrollRef.current;
    if (!container) return;

    const rafId = requestAnimationFrame(updateCanScrollRight);
    const handleScroll = () => updateCanScrollRight();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateCanScrollRight);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateCanScrollRight);
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateCanScrollRight);
      resizeObserver?.disconnect();
    };
  }, [isEmpty, sortedCoins.length, updateCanScrollRight]);

  const handleScrollFavoritesRight = useCallback(() => {
    favoritesScrollRef.current?.scrollBy({
      left: FAVORITES_SCROLL_STEP,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className="mx-[6px] mt-[6px] h-[48px] shrink-0 rounded-[6px] bg-rb-neutral-bg-1 flex items-center gap-[24px] px-[12px] min-w-0">
      <div className="flex flex-1 min-w-0 items-center gap-[12px] overflow-hidden">
        <RcIconTopBarLogo className="w-[24px] h-[24px] shrink-0" />

        <div className="h-[12px] w-0 border-l border-solid border-rb-neutral-line shrink-0" />

        {isEmpty ? (
          <div className="text-[12px] leading-[14px] text-rb-neutral-secondary truncate">
            {t('page.perpsPro.topBar.favoriteEmpty')}
          </div>
        ) : (
          <div className="flex flex-1 min-w-0 items-center gap-[8px] overflow-hidden">
            <RcIconStar className="w-[16px] h-[16px] text-rb-orange-default shrink-0" />
            <div
              ref={favoritesScrollRef}
              className="flex flex-1 min-w-0 items-center gap-[24px] overflow-x-auto scrollbar-hide whitespace-nowrap"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {sortedCoins.map((coin) => {
                const market = marketDataMap[coin];
                if (!market) return null;

                const priceChange = getPriceChangePercent(
                  market.markPx,
                  market.prevDayPx
                );
                const isPositive = priceChange > 0;
                const isNegative = priceChange < 0;
                const base = formatPerpsCoin(market.displayName || coin);
                const quote = market.quoteAsset || 'USDC';

                return (
                  <button
                    type="button"
                    key={coin}
                    className="group flex shrink-0 items-center gap-[6px] border-0 bg-transparent p-0 text-[12px] leading-[14px] cursor-pointer"
                    onClick={() => dispatch.perps.updateSelectedCoin(coin)}
                  >
                    <span className="text-rb-neutral-title-1 group-hover:text-rb-brand-default transition-colors">
                      {base}-{quote}
                    </span>
                    <span
                      className={clsx(
                        'transition-colors',
                        isPositive && 'text-rb-green-default',
                        isNegative && 'text-rb-red-default',
                        !isPositive &&
                          !isNegative &&
                          'text-rb-neutral-secondary'
                      )}
                    >
                      {isPositive ? '+' : ''}
                      {priceChange.toFixed(2)}%
                    </span>
                  </button>
                );
              })}
            </div>
            {canScrollRight ? (
              <button
                type="button"
                aria-label="Scroll favorites"
                className="flex h-[20px] w-[20px] shrink-0 items-center justify-center border-0 bg-transparent p-0 text-rb-neutral-secondary hover:text-rb-neutral-title-1 cursor-pointer"
                onClick={handleScrollFavoritesRight}
              >
                <RcIconOverflowArrow className="h-[6.25px] w-[11.25px] -rotate-90" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="desktop-perps-topbar-actions flex shrink-0 items-center gap-[12px]">
        <DesktopAccountSelector
          scene="perps"
          value={currentPerpsAccount}
          onChange={switchPerpsAccount}
          className="desktop-perps-topbar-account"
        />
        <AccountActions compact />
      </div>
    </div>
  );
};
