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

const DEFAULT_SCROLL_STATE = {
  canScrollLeft: false,
  canScrollRight: false,
};

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
  const [scrollState, setScrollState] = useState(DEFAULT_SCROLL_STATE);

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

  const updateScrollState = useCallback(() => {
    const container = favoritesScrollRef.current;
    if (!container) {
      setScrollState(DEFAULT_SCROLL_STATE);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const nextState = {
      canScrollLeft: scrollLeft > 1,
      canScrollRight: scrollLeft + clientWidth < scrollWidth - 1,
    };

    setScrollState((prev) =>
      prev.canScrollLeft === nextState.canScrollLeft &&
      prev.canScrollRight === nextState.canScrollRight
        ? prev
        : nextState
    );
  }, []);

  useEffect(() => {
    if (isEmpty) {
      setScrollState(DEFAULT_SCROLL_STATE);
      return;
    }

    const container = favoritesScrollRef.current;
    if (!container) return;

    const rafId = requestAnimationFrame(updateScrollState);
    const handleScroll = () => updateScrollState();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [isEmpty, sortedCoins.length, updateScrollState]);

  const handleScrollFavoritesLeft = useCallback(() => {
    favoritesScrollRef.current?.scrollBy({
      left: -FAVORITES_SCROLL_STEP,
      behavior: 'smooth',
    });
  }, []);

  const handleScrollFavoritesRight = useCallback(() => {
    favoritesScrollRef.current?.scrollBy({
      left: FAVORITES_SCROLL_STEP,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className="desktop-perps-topbar mx-[6px] mt-[6px] h-[48px] rounded-[6px] bg-rb-neutral-bg-1 flex items-center gap-[24px] px-[12px] min-w-0">
      <div className="flex flex-1 min-w-0 items-center gap-[12px] overflow-hidden">
        <RcIconTopBarLogo className="desktop-perps-topbar-logo w-[24px] h-[24px]" />

        <div className="desktop-perps-topbar-divider h-[12px] w-0 border-l border-solid border-rb-neutral-line" />

        {isEmpty ? (
          <div className="text-[12px] leading-[14px] text-rb-neutral-secondary truncate">
            {t('page.perpsPro.topBar.favoriteEmpty')}
          </div>
        ) : (
          <div className="flex flex-1 min-w-0 items-center gap-[8px] overflow-hidden">
            <RcIconStar className="desktop-perps-topbar-favorite-star w-[16px] h-[16px] text-rb-orange-default" />
            {scrollState.canScrollLeft ? (
              <button
                type="button"
                aria-label="Scroll favorites left"
                className="desktop-perps-topbar-favorites-arrow desktop-perps-topbar-favorites-arrow-left"
                onClick={handleScrollFavoritesLeft}
              >
                <RcIconOverflowArrow className="desktop-perps-topbar-overflow-icon desktop-perps-topbar-overflow-icon-left" />
              </button>
            ) : null}
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
                    className="desktop-perps-topbar-favorite-item group flex items-center gap-[6px] border-0 bg-transparent p-0 text-[12px] leading-[14px] cursor-pointer"
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
            {scrollState.canScrollRight ? (
              <button
                type="button"
                aria-label="Scroll favorites right"
                className="desktop-perps-topbar-favorites-arrow desktop-perps-topbar-favorites-arrow-right"
                onClick={handleScrollFavoritesRight}
              >
                <RcIconOverflowArrow className="desktop-perps-topbar-overflow-icon desktop-perps-topbar-overflow-icon-right" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="desktop-perps-topbar-actions flex items-center gap-[12px]">
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
