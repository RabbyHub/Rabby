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
const TICKER_PENDING_SYNC_MS = 500;
const TICKER_TEXT_WIDTH_TOLERANCE = 1;

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

type TickerDisplayText = {
  pair: string;
  change: string;
  price: string;
  isPositive: boolean;
  isNegative: boolean;
};

type TickerTextWidthBudget = {
  changeText: string;
  changeWidth: number;
  priceText: string;
  priceWidth: number;
};

type TickerTextWidthBudgetMap = Record<string, TickerTextWidthBudget>;

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
  const { marketData, wsActiveAssetCtx } = store.getState().perps;

  return marketData
    .map((item) => {
      if (wsActiveAssetCtx?.coin !== item.name) {
        return item;
      }

      return {
        ...item,
        ...wsActiveAssetCtx.ctx,
      };
    })
    .filter((item) => Number(item.markPx || 0) > 0)
    .sort((a, b) => Number(b.dayNtlVlm || 0) - Number(a.dayNtlVlm || 0))
    .map(toTickerMarket);
};

const getTickerSnapshotKey = (markets: TickerMarket[]) => {
  return markets
    .map(
      (item) =>
        `${item.dexId || 'hyper'}:${item.name}:${item.displayName}:${
          item.quoteAsset || 'USDC'
        }:${item.markPx || ''}:${item.prevDayPx || ''}`
    )
    .join('|');
};

const getPriceChangePercent = (markPx?: string, prevDayPx?: string) => {
  const mark = Number(markPx || 0);
  const prev = Number(prevDayPx || 0);
  if (!mark || !prev) return 0;
  return ((mark - prev) / prev) * 100;
};

const getTickerDisplayText = (item: TickerMarket): TickerDisplayText => {
  const priceChange = getPriceChangePercent(item.markPx, item.prevDayPx);
  const isPositive = priceChange > 0;
  const isNegative = priceChange < 0;
  const pair = `${formatPerpsCoin(item.displayName || item.name)}-${
    item.quoteAsset || 'USDC'
  }`;
  const change = `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%`;
  const price = splitNumberByStep(Number(item.markPx));

  return {
    pair,
    change,
    price,
    isPositive,
    isNegative,
  };
};

const isSameTickerStructure = (a: TickerMarket, b: TickerMarket) => {
  return (
    a.name === b.name &&
    a.dexId === b.dexId &&
    a.displayName === b.displayName &&
    a.quoteAsset === b.quoteAsset
  );
};

const isSameTickerValue = (a?: TickerMarket, b?: TickerMarket) => {
  if (!a || !b) return a === b;
  return (
    isSameTickerStructure(a, b) &&
    a.markPx === b.markPx &&
    a.prevDayPx === b.prevDayPx &&
    a.dayNtlVlm === b.dayNtlVlm
  );
};

const isSameTickerWidthBudgetMap = (
  a: TickerTextWidthBudgetMap,
  b: TickerTextWidthBudgetMap
) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => {
    const aItem = a[key];
    const bItem = b[key];
    return (
      Boolean(bItem) &&
      aItem.changeText === bItem.changeText &&
      aItem.changeWidth === bItem.changeWidth &&
      aItem.priceText === bItem.priceText &&
      aItem.priceWidth === bItem.priceWidth
    );
  });
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
  const tickerTextMeasureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tickerTextMeasureFontRef = useRef('400 12px sans-serif');
  const tickerPendingMarketsRef = useRef<TickerMarket[]>([]);
  const tickerPendingSnapshotKeyRef = useRef('');
  const tickerDisplaySnapshotKeyRef = useRef('');
  const tickerSnapshotMarketsRef = useRef<TickerMarket[]>([]);
  const tickerVisibleCountRef = useRef(TICKER_FALLBACK_MARKET_COUNT);
  const tickerWidthBudgetRef = useRef<TickerTextWidthBudgetMap>({});
  const tickerOffsetRef = useRef(0);
  const tickerLoopWidthRef = useRef(0);
  const tickerLastFrameTimeRef = useRef<number | null>(null);
  const tickerPausedRef = useRef(false);
  const tickerPrefersReducedMotionRef = useRef(false);
  const [isConnected, setIsConnected] = useState(true);
  const [tickerSnapshotMarkets, setTickerSnapshotMarkets] = useState<
    TickerMarket[]
  >([]);
  const [tickerLiveValueMap, setTickerLiveValueMap] = useState<
    Record<string, TickerMarket>
  >({});
  const [
    tickerWidthBudget,
    setTickerWidthBudget,
  ] = useState<TickerTextWidthBudgetMap>({});
  const [tickerVisibleCount, setTickerVisibleCount] = useState(
    TICKER_FALLBACK_MARKET_COUNT
  );
  const { t } = useTranslation();

  const tickerSnapshotKey = useMemo(
    () => getTickerSnapshotKey(tickerSnapshotMarkets),
    [tickerSnapshotMarkets]
  );

  const tickerMarkets = useMemo(() => {
    return tickerSnapshotMarkets
      .slice(0, tickerVisibleCount)
      .map((item) => tickerLiveValueMap[item.name] || item);
  }, [tickerLiveValueMap, tickerSnapshotMarkets, tickerVisibleCount]);

  const syncTickerTextMeasureFont = useCallback(() => {
    const sample =
      tickerLoopRef.current?.querySelector<HTMLElement>(
        '.desktop-perps-status-item-price'
      ) ||
      tickerMeasureRef.current?.querySelector<HTMLElement>(
        '.desktop-perps-status-item-price'
      );
    if (!sample || typeof window === 'undefined') return;

    const style = window.getComputedStyle(sample);
    tickerTextMeasureFontRef.current =
      style.font ||
      `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  }, []);

  const measureTickerTextWidth = useCallback((text: string) => {
    if (typeof document === 'undefined') {
      return Number.POSITIVE_INFINITY;
    }

    if (!tickerTextMeasureCanvasRef.current) {
      tickerTextMeasureCanvasRef.current = document.createElement('canvas');
    }

    const context = tickerTextMeasureCanvasRef.current.getContext('2d');
    if (!context) {
      return Number.POSITIVE_INFINITY;
    }

    context.font = tickerTextMeasureFontRef.current;
    return context.measureText(text).width;
  }, []);

  const isTickerTextWithinBudget = useCallback(
    (text: string, baseText: string, width: number) => {
      return (
        text.length <= baseText.length ||
        measureTickerTextWidth(text) <= width + TICKER_TEXT_WIDTH_TOLERANCE
      );
    },
    [measureTickerTextWidth]
  );

  const isTickerValueWidthSafe = useCallback(
    (item: TickerMarket, budget: TickerTextWidthBudget) => {
      const text = getTickerDisplayText(item);
      return (
        isTickerTextWithinBudget(
          text.change,
          budget.changeText,
          budget.changeWidth
        ) &&
        isTickerTextWithinBudget(
          text.price,
          budget.priceText,
          budget.priceWidth
        )
      );
    },
    [isTickerTextWithinBudget]
  );

  const syncLiveTickerValues = useCallback(
    (latestMarkets: TickerMarket[]) => {
      const snapshotMarkets = tickerSnapshotMarketsRef.current;
      const visibleCount = tickerVisibleCountRef.current;
      const budgets = tickerWidthBudgetRef.current;
      if (snapshotMarkets.length === 0 || visibleCount === 0) return;

      const latestMap = latestMarkets.reduce((acc, item) => {
        acc[item.name] = item;
        return acc;
      }, {} as Record<string, TickerMarket>);
      const visibleSnapshotMarkets = snapshotMarkets.slice(0, visibleCount);

      setTickerLiveValueMap((prev) => {
        let changed = false;
        const next: Record<string, TickerMarket> = {};

        visibleSnapshotMarkets.forEach((snapshotItem) => {
          const latestItem = latestMap[snapshotItem.name];
          const budget = budgets[snapshotItem.name];
          const prevItem = prev[snapshotItem.name];

          if (
            latestItem &&
            budget &&
            isSameTickerStructure(snapshotItem, latestItem) &&
            isTickerValueWidthSafe(latestItem, budget)
          ) {
            next[snapshotItem.name] = latestItem;
          } else if (
            prevItem &&
            isSameTickerStructure(snapshotItem, prevItem)
          ) {
            next[snapshotItem.name] = prevItem;
          }

          if (!isSameTickerValue(prevItem, next[snapshotItem.name])) {
            changed = true;
          }
        });

        if (Object.keys(prev).length !== Object.keys(next).length) {
          changed = true;
        }

        return changed ? next : prev;
      });
    },
    [isTickerValueWidthSafe]
  );

  const commitTickerSnapshot = useCallback((markets?: TickerMarket[]) => {
    const nextMarkets = markets || tickerPendingMarketsRef.current;
    const nextKey =
      markets || !tickerPendingSnapshotKeyRef.current
        ? getTickerSnapshotKey(nextMarkets)
        : tickerPendingSnapshotKeyRef.current;

    if (tickerDisplaySnapshotKeyRef.current === nextKey) {
      return false;
    }

    tickerDisplaySnapshotKeyRef.current = nextKey;
    tickerSnapshotMarketsRef.current = nextMarkets;
    tickerOffsetRef.current = 0;
    tickerLoopWidthRef.current = 0;
    tickerLastFrameTimeRef.current = null;
    setTickerLiveValueMap({});
    setTickerSnapshotMarkets(nextMarkets);
    return true;
  }, []);

  const syncTickerVisibleCount = useCallback(() => {
    const viewport = tickerViewportRef.current;
    const measure = tickerMeasureRef.current;
    const viewportWidth = viewport?.getBoundingClientRect().width || 0;
    const measuredItems = measure
      ? (Array.from(measure.children) as HTMLElement[])
      : [];

    const fallbackCount = Math.min(
      tickerSnapshotMarkets.length,
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
    const nextWidthBudget: TickerTextWidthBudgetMap = {};
    let hasReachedViewportWidth = false;

    for (const item of measuredItems) {
      const itemWidth = item.getBoundingClientRect().width;
      if (!itemWidth) continue;

      const tickerName = item.dataset.tickerName;
      const changeEl = item.querySelector<HTMLElement>(
        '.desktop-perps-status-item-change'
      );
      const priceEl = item.querySelector<HTMLElement>(
        '.desktop-perps-status-item-price'
      );
      if (tickerName && changeEl && priceEl) {
        nextWidthBudget[tickerName] = {
          changeText: changeEl.textContent || '',
          changeWidth: Math.ceil(changeEl.getBoundingClientRect().width),
          priceText: priceEl.textContent || '',
          priceWidth: Math.ceil(priceEl.getBoundingClientRect().width),
        };
      }

      if (hasReachedViewportWidth) {
        continue;
      }

      const nextWidth =
        visibleCount === 0
          ? itemWidth
          : usedWidth + TICKER_ITEM_GAP + itemWidth;

      if (nextWidth <= viewportWidth || visibleCount === 0) {
        visibleCount += 1;
        usedWidth = nextWidth;
      } else {
        hasReachedViewportWidth = true;
      }
    }

    const nextCount =
      visibleCount > 0
        ? Math.min(
            tickerSnapshotMarkets.length,
            visibleCount + TICKER_EXTRA_VISIBLE_ITEMS
          )
        : fallbackCount;

    tickerVisibleCountRef.current = nextCount;
    tickerWidthBudgetRef.current = nextWidthBudget;
    setTickerVisibleCount((prev) => (prev === nextCount ? prev : nextCount));
    setTickerWidthBudget((prev) =>
      isSameTickerWidthBudgetMap(prev, nextWidthBudget) ? prev : nextWidthBudget
    );

    return nextCount;
  }, [tickerSnapshotMarkets.length]);

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
    syncTickerTextMeasureFont();
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
  }, [syncTickerTextMeasureFont, syncTickerVisibleCount, tickerSnapshotKey]);

  useEffect(() => {
    // Poll latest ticker data into refs; commit layout only at loop boundaries.
    const syncPendingTickerSnapshot = (forceCommit = false) => {
      const nextMarkets = getSortedTickerMarkets();
      const nextKey = getTickerSnapshotKey(nextMarkets);
      tickerPendingMarketsRef.current = nextMarkets;
      tickerPendingSnapshotKeyRef.current = nextKey;

      if (
        forceCommit ||
        !tickerDisplaySnapshotKeyRef.current ||
        tickerPrefersReducedMotionRef.current
      ) {
        commitTickerSnapshot(nextMarkets);
      } else {
        syncLiveTickerValues(nextMarkets);
      }
    };

    syncPendingTickerSnapshot(true);
    const interval = setInterval(
      syncPendingTickerSnapshot,
      TICKER_PENDING_SYNC_MS
    );
    return () => clearInterval(interval);
  }, [commitTickerSnapshot, syncLiveTickerValues]);

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
  }, [tickerMarkets.length, tickerSnapshotKey, syncTickerLoopWidth]);

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
        const nextOffset =
          tickerOffsetRef.current + elapsedSeconds * MARQUEE_PIXELS_PER_SECOND;
        if (nextOffset >= loopWidth) {
          commitTickerSnapshot();
          tickerOffsetRef.current = 0;
        } else {
          tickerOffsetRef.current = nextOffset;
        }
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
  }, [commitTickerSnapshot, tickerMarkets.length, syncTickerLoopWidth]);

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
      const text = getTickerDisplayText(item);
      const widthBudget = isMeasure ? null : tickerWidthBudget[item.name];

      return (
        <button
          type="button"
          key={key}
          className="desktop-perps-status-item group"
          data-ticker-name={item.name}
          tabIndex={isMeasure ? -1 : undefined}
          onClick={
            isMeasure ? undefined : () => handleSelectTickerMarket(item.name)
          }
        >
          <span className="desktop-perps-status-item-name text-rb-neutral-foot transition-colors group-hover:text-rb-brand-default">
            {text.pair}
          </span>
          <span
            className={clsx(
              'desktop-perps-status-item-change',
              text.isPositive && 'text-rb-green-default',
              text.isNegative && 'text-rb-red-default',
              !text.isPositive &&
                !text.isNegative &&
                'text-rb-neutral-secondary'
            )}
            style={
              widthBudget?.changeWidth
                ? { width: widthBudget.changeWidth }
                : undefined
            }
          >
            {text.change}
          </span>
          <span
            className="desktop-perps-status-item-price text-rb-neutral-secondary"
            style={
              widthBudget?.priceWidth
                ? { width: widthBudget.priceWidth }
                : undefined
            }
          >
            {text.price}
          </span>
        </button>
      );
    },
    [handleSelectTickerMarket, tickerWidthBudget]
  );

  const tickerMeasureItems = useMemo(() => {
    return tickerSnapshotMarkets.map((item) =>
      renderTickerItem(
        item,
        `${item.dexId || 'hyper'}-${item.name}-measure`,
        true
      )
    );
  }, [renderTickerItem, tickerSnapshotMarkets]);

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
            {tickerMeasureItems}
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
