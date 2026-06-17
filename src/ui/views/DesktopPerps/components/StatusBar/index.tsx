import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import clsx from 'clsx';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { ReactComponent as RcIconTwitter } from '@/ui/assets/perps/IconTwitter.svg';
import { ReactComponent as RcIconDiscord } from '@/ui/assets/perps/IconDiscord.svg';
import { ReactComponent as RcIconOpenVolume } from '@/ui/assets/perps/IconOpenVolume.svg';
import { ReactComponent as RcIconClosedVolume } from '@/ui/assets/perps/IconClosedVolume.svg';
import { ReactComponent as RcIconDocs } from '@/ui/assets/perps/IconDocument.svg';
import { useTranslation } from 'react-i18next';
import { openInTab, splitNumberByStep } from '@/ui/utils';
import store, { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { playSound } from '@/ui/utils/sound';
import { formatPerpsCoin } from '../../utils';
import type { MarketData } from '@/ui/models/perps';

const MARQUEE_PIXELS_PER_SECOND = 21;
const TICKER_EXTRA_VISIBLE_ITEMS = 3;
const TICKER_FALLBACK_MARKET_COUNT = 12;
const TICKER_ITEM_GAP = 24;
const TICKER_STRUCTURE_SYNC_MS = 5000;
const TICKER_STRUCTURE_POLL_MS = 500;
const TICKER_VALUE_SYNC_MS = 500;

type TickerMarket = Pick<
  MarketData,
  | 'name'
  | 'displayName'
  | 'quoteAsset'
  | 'dexId'
  | 'dayNtlVlm'
  | 'markPx'
  | 'prevDayPx'
>;

const toTickerMarket = (item: MarketData): TickerMarket => ({
  name: item.name,
  displayName: item.displayName,
  quoteAsset: item.quoteAsset,
  dexId: item.dexId,
  dayNtlVlm: item.dayNtlVlm,
  markPx: item.markPx,
  prevDayPx: item.prevDayPx,
});

const getSortedTickerMarkets = () => {
  return store
    .getState()
    .perps.marketData.filter((item) => Number(item.markPx || 0) > 0)
    .sort((a, b) => Number(b.dayNtlVlm || 0) - Number(a.dayNtlVlm || 0))
    .map(toTickerMarket);
};

const getTickerStructureKey = (markets: TickerMarket[]) => {
  return markets
    .map(
      (item) =>
        `${item.dexId || 'hyper'}:${item.name}:${item.displayName}:${
          item.quoteAsset || 'USDC'
        }`
    )
    .join('|');
};

const getPriceChangePercent = (markPx?: string, prevDayPx?: string) => {
  const mark = Number(markPx || 0);
  const prev = Number(prevDayPx || 0);
  if (!mark || !prev) return 0;
  return ((mark - prev) / prev) * 100;
};

const OnlineStatus: React.FC<{ online: boolean }> = ({ online }) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex h-[20px] w-[60px] items-center justify-center gap-[4px] rounded-[4px] border-[0.5px] border-solid text-[12px] leading-[14px] font-medium',
        online
          ? 'border-rb-green-default text-rb-green-default bg-rb-green-light-1'
          : 'border-rb-neutral-line text-rb-neutral-secondary bg-rb-neutral-bg-2'
      )}
    >
      <span
        className={clsx(
          'w-[4px] h-[4px] rounded-full',
          online ? 'bg-rb-green-default' : 'bg-rb-neutral-secondary'
        )}
      />
      <span>
        {online
          ? t('page.perpsPro.statusBar.online')
          : t('page.perpsPro.statusBar.offline')}
      </span>
    </div>
  );
};

export const StatusBar: React.FC = () => {
  const soundEnabled = useRabbySelector((state) => state.perps.soundEnabled);
  const dispatch = useRabbyDispatch();
  const tickerViewportRef = useRef<HTMLDivElement>(null);
  const tickerTrackRef = useRef<HTMLDivElement>(null);
  const tickerLoopRef = useRef<HTMLDivElement>(null);
  const tickerMeasureRef = useRef<HTMLDivElement>(null);
  const tickerStructureKeyRef = useRef('');
  const tickerStructureLastSyncAtRef = useRef(0);
  const tickerOffsetRef = useRef(0);
  const tickerLoopWidthRef = useRef(0);
  const tickerLastFrameTimeRef = useRef<number | null>(null);
  const tickerPausedRef = useRef(false);
  const tickerPrefersReducedMotionRef = useRef(false);
  const [isConnected, setIsConnected] = useState(true);
  const [tickerStructureMarkets, setTickerStructureMarkets] = useState<
    TickerMarket[]
  >([]);
  const [tickerValueMap, setTickerValueMap] = useState<
    Record<string, TickerMarket>
  >({});
  const [tickerVisibleCount, setTickerVisibleCount] = useState(
    TICKER_FALLBACK_MARKET_COUNT
  );
  const { t } = useTranslation();

  const tickerStructureKey = useMemo(
    () => getTickerStructureKey(tickerStructureMarkets),
    [tickerStructureMarkets]
  );

  const tickerMarketNames = useMemo(() => {
    return tickerStructureMarkets
      .slice(0, tickerVisibleCount)
      .map((item) => item.name);
  }, [tickerStructureMarkets, tickerVisibleCount]);

  const tickerMarketNamesKey = useMemo(() => tickerMarketNames.join('|'), [
    tickerMarketNames,
  ]);

  const tickerMarkets = useMemo(() => {
    return tickerStructureMarkets
      .slice(0, tickerVisibleCount)
      .map((item) => tickerValueMap[item.name] || item);
  }, [tickerStructureMarkets, tickerValueMap, tickerVisibleCount]);

  const syncTickerStructure = useCallback((force = false) => {
    const now = Date.now();
    if (
      !force &&
      tickerStructureKeyRef.current &&
      now - tickerStructureLastSyncAtRef.current < TICKER_STRUCTURE_SYNC_MS
    ) {
      return;
    }

    tickerStructureLastSyncAtRef.current = now;
    const nextMarkets = getSortedTickerMarkets();
    const nextKey = getTickerStructureKey(nextMarkets);
    if (tickerStructureKeyRef.current === nextKey) {
      return;
    }

    tickerStructureKeyRef.current = nextKey;
    setTickerStructureMarkets(nextMarkets);
  }, []);

  const syncTickerVisibleCount = useCallback(() => {
    const viewport = tickerViewportRef.current;
    const measure = tickerMeasureRef.current;
    const viewportWidth = viewport?.getBoundingClientRect().width || 0;
    const measuredItems = measure
      ? (Array.from(measure.children) as HTMLElement[])
      : [];

    const fallbackCount = Math.min(
      tickerStructureMarkets.length,
      TICKER_FALLBACK_MARKET_COUNT
    );

    if (!viewportWidth || measuredItems.length === 0) {
      setTickerVisibleCount((prev) =>
        prev === fallbackCount ? prev : fallbackCount
      );
      return fallbackCount;
    }

    let visibleCount = 0;
    let usedWidth = 0;

    for (const item of measuredItems) {
      const itemWidth = item.getBoundingClientRect().width;
      if (!itemWidth) continue;

      const nextWidth =
        visibleCount === 0
          ? itemWidth
          : usedWidth + TICKER_ITEM_GAP + itemWidth;

      if (nextWidth <= viewportWidth || visibleCount === 0) {
        visibleCount += 1;
        usedWidth = nextWidth;
      } else {
        break;
      }
    }

    const nextCount =
      visibleCount > 0
        ? Math.min(
            tickerStructureMarkets.length,
            visibleCount + TICKER_EXTRA_VISIBLE_ITEMS
          )
        : fallbackCount;

    setTickerVisibleCount((prev) => (prev === nextCount ? prev : nextCount));

    return nextCount;
  }, [tickerStructureMarkets.length]);

  const syncTickerLoopWidth = useCallback(() => {
    const loop = tickerLoopRef.current;
    if (!loop) return 0;

    const rectWidth = loop.getBoundingClientRect().width;
    const singleLoopWidth = rectWidth || loop.scrollWidth || 0;
    tickerLoopWidthRef.current = singleLoopWidth;

    if (singleLoopWidth > 0 && tickerOffsetRef.current >= singleLoopWidth) {
      tickerOffsetRef.current %= singleLoopWidth;
    }

    return singleLoopWidth;
  }, []);

  useLayoutEffect(() => {
    syncTickerVisibleCount();
    window.addEventListener('resize', syncTickerVisibleCount);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        syncTickerVisibleCount();
      });
      if (tickerViewportRef.current) {
        resizeObserver.observe(tickerViewportRef.current);
      }
    }

    return () => {
      window.removeEventListener('resize', syncTickerVisibleCount);
      resizeObserver?.disconnect();
    };
  }, [syncTickerVisibleCount, tickerStructureKey]);

  // Keep layout measurement off the high-frequency all-market ticker stream.
  useEffect(() => {
    syncTickerStructure(true);
    const interval = setInterval(syncTickerStructure, TICKER_STRUCTURE_POLL_MS);
    return () => clearInterval(interval);
  }, [syncTickerStructure]);

  useEffect(() => {
    if (tickerMarketNames.length === 0) {
      setTickerValueMap({});
      return;
    }

    const tickerNames = tickerMarketNames;
    const syncTickerValues = () => {
      const latestMap = store.getState().perps.marketDataMap;
      setTickerValueMap((prev) => {
        let changed = false;
        const next: Record<string, TickerMarket> = {};

        tickerNames.forEach((name) => {
          const latest = latestMap[name];
          const nextItem = latest ? toTickerMarket(latest) : prev[name];
          if (!nextItem) return;
          next[name] = nextItem;

          const prevItem = prev[name];
          if (
            !prevItem ||
            prevItem.markPx !== nextItem.markPx ||
            prevItem.prevDayPx !== nextItem.prevDayPx ||
            prevItem.displayName !== nextItem.displayName ||
            prevItem.quoteAsset !== nextItem.quoteAsset
          ) {
            changed = true;
          }
        });

        if (Object.keys(prev).length !== Object.keys(next).length) {
          changed = true;
        }

        return changed ? next : prev;
      });
    };

    syncTickerValues();
    const interval = setInterval(syncTickerValues, TICKER_VALUE_SYNC_MS);
    return () => clearInterval(interval);
  }, [tickerMarketNames]);

  useEffect(() => {
    const sdk = getPerpsSDK();
    // Check WebSocket connection status periodically
    const checkConnection = () => {
      setIsConnected(sdk.ws.isConnected ?? true);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    const track = tickerTrackRef.current;

    if (tickerMarkets.length === 0) {
      tickerOffsetRef.current = 0;
      tickerLoopWidthRef.current = 0;
      tickerLastFrameTimeRef.current = null;
      if (track) {
        track.style.transform = 'translate3d(0, 0, 0)';
      }
      return;
    }

    syncTickerLoopWidth();
    window.addEventListener('resize', syncTickerLoopWidth);

    return () => {
      window.removeEventListener('resize', syncTickerLoopWidth);
    };
  }, [tickerMarkets.length, tickerMarketNamesKey, syncTickerLoopWidth]);

  useLayoutEffect(() => {
    const track = tickerTrackRef.current;
    if (!track || tickerMarkets.length === 0) return;

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const syncReducedMotion = () => {
      tickerPrefersReducedMotionRef.current = Boolean(mediaQuery?.matches);
      if (tickerPrefersReducedMotionRef.current) {
        tickerOffsetRef.current = 0;
        tickerLastFrameTimeRef.current = null;
        track.style.transform = 'translate3d(0, 0, 0)';
      }
    };

    syncReducedMotion();
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', syncReducedMotion);
    } else {
      mediaQuery?.addListener?.(syncReducedMotion);
    }

    let frameId = 0;
    const step = (timestamp: number) => {
      const loopWidth = tickerLoopWidthRef.current || syncTickerLoopWidth();
      const lastTimestamp = tickerLastFrameTimeRef.current ?? timestamp;
      const elapsedSeconds = Math.min(timestamp - lastTimestamp, 1000) / 1000;

      tickerLastFrameTimeRef.current = timestamp;

      if (tickerPrefersReducedMotionRef.current) {
        track.style.transform = 'translate3d(0, 0, 0)';
      } else if (!tickerPausedRef.current && loopWidth > 0) {
        tickerOffsetRef.current =
          (tickerOffsetRef.current +
            elapsedSeconds * MARQUEE_PIXELS_PER_SECOND) %
          loopWidth;
        track.style.transform = `translate3d(${-tickerOffsetRef.current}px, 0, 0)`;
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', syncReducedMotion);
      } else {
        mediaQuery?.removeListener?.(syncReducedMotion);
      }
      tickerLastFrameTimeRef.current = null;
    };
  }, [tickerMarkets.length, syncTickerLoopWidth]);

  const handleOpenTwitter = () => {
    openInTab('https://twitter.com/Rabby_io');
  };

  const handleOpenDiscord = () => {
    openInTab('https://discord.gg/seFBCWmUre');
  };

  const handleOpenDocs = () => {
    openInTab('https://support.rabby.io/');
  };

  const handleToggleSound = () => {
    if (!soundEnabled) {
      playSound('/sounds/order-filled.mp3');
    }
    dispatch.perps.updateEnabledSound(!soundEnabled);
  };

  const handleSelectTickerMarket = useCallback(
    (coin: string) => {
      dispatch.perps.updateSelectedCoin(coin);
    },
    [dispatch]
  );

  const handleTickerMouseEnter = useCallback(() => {
    tickerPausedRef.current = true;
  }, []);

  const handleTickerMouseLeave = useCallback(() => {
    tickerPausedRef.current = false;
    tickerLastFrameTimeRef.current = null;
  }, []);

  const RcIconVolume = soundEnabled ? RcIconOpenVolume : RcIconClosedVolume;

  const renderTickerItem = useCallback(
    (item: TickerMarket, key: string, isMeasure = false) => {
      const priceChange = getPriceChangePercent(item.markPx, item.prevDayPx);
      const isPositive = priceChange > 0;
      const isNegative = priceChange < 0;
      const pair = `${formatPerpsCoin(item.displayName || item.name)}-${
        item.quoteAsset || 'USDC'
      }`;

      return (
        <button
          type="button"
          key={key}
          className="desktop-perps-status-item group"
          tabIndex={isMeasure ? -1 : undefined}
          onClick={
            isMeasure ? undefined : () => handleSelectTickerMarket(item.name)
          }
        >
          <span className="desktop-perps-status-item-name text-rb-neutral-foot transition-colors group-hover:text-rb-brand-default">
            {pair}
          </span>
          <span
            className={clsx(
              'desktop-perps-status-item-change',
              isPositive && 'text-rb-green-default',
              isNegative && 'text-rb-red-default',
              !isPositive && !isNegative && 'text-rb-neutral-secondary'
            )}
          >
            {isPositive ? '+' : ''}
            {priceChange.toFixed(2)}%
          </span>
          <span className="desktop-perps-status-item-price text-rb-neutral-secondary">
            {splitNumberByStep(Number(item.markPx))}
          </span>
        </button>
      );
    },
    [handleSelectTickerMarket]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-rb-neutral-bg-page p-[6px] z-30">
      <div className="h-[32px] rounded-[6px] bg-rb-neutral-bg-1 flex items-center overflow-hidden px-[12px] gap-[12px]">
        <div className="desktop-perps-status-side flex items-center">
          <OnlineStatus online={isConnected} />
        </div>

        <div
          ref={tickerViewportRef}
          className="desktop-perps-status-ticker flex-1 min-w-0 overflow-hidden"
          onMouseEnter={handleTickerMouseEnter}
          onMouseLeave={handleTickerMouseLeave}
        >
          {tickerMarkets.length > 0 ? (
            <div
              ref={tickerTrackRef}
              className="desktop-perps-status-track flex w-max items-center"
            >
              <div ref={tickerLoopRef} className="desktop-perps-status-loop">
                {tickerMarkets.map((item) =>
                  renderTickerItem(
                    item,
                    `${item.dexId || 'hyper'}-${item.name}`
                  )
                )}
              </div>
              <div className="desktop-perps-status-loop" aria-hidden>
                {tickerMarkets.map((item) =>
                  renderTickerItem(
                    item,
                    `${item.dexId || 'hyper'}-${item.name}-duplicate`
                  )
                )}
              </div>
            </div>
          ) : null}
          <div
            ref={tickerMeasureRef}
            className="desktop-perps-status-measure"
            aria-hidden
          >
            {tickerStructureMarkets.map((item) => {
              return renderTickerItem(
                item,
                `${item.dexId || 'hyper'}-${item.name}-measure`,
                true
              );
            })}
          </div>
        </div>

        <div className="desktop-perps-status-actions flex items-center gap-[12px]">
          <button
            type="button"
            title={t('page.perpsPro.statusBar.sound')}
            className="flex h-[20px] w-[20px] items-center justify-center border-0 bg-transparent p-0 text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
            onClick={handleToggleSound}
          >
            <RcIconVolume className="h-[20px] w-[20px]" />
          </button>
          <div className="h-[12px] w-0 border-l border-solid border-rb-neutral-line" />
          <RcIconTwitter
            className="h-[20px] w-[20px] text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
            onClick={handleOpenTwitter}
          />
          <RcIconDiscord
            className="h-[20px] w-[20px] text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
            onClick={handleOpenDiscord}
          />
          <RcIconDocs
            className="h-[20px] w-[20px] text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
            onClick={handleOpenDocs}
          />
        </div>
      </div>
    </div>
  );
};
