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
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { playSound } from '@/ui/utils/sound';
import { formatPerpsCoin } from '../../utils';
import type { MarketData } from '@/ui/models/perps';

const MARQUEE_PIXELS_PER_SECOND = 21;

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
  const marketData = useRabbySelector((state) => state.perps.marketData);
  const marketDataMap = useRabbySelector((state) => state.perps.marketDataMap);
  const dispatch = useRabbyDispatch();
  const tickerTrackRef = useRef<HTMLDivElement>(null);
  const tickerLoopRef = useRef<HTMLDivElement>(null);
  const tickerOffsetRef = useRef(0);
  const tickerLoopWidthRef = useRef(0);
  const tickerLastFrameTimeRef = useRef<number | null>(null);
  const tickerPausedRef = useRef(false);
  const tickerPrefersReducedMotionRef = useRef(false);
  const [isConnected, setIsConnected] = useState(true);
  const [tickerMarketIds, setTickerMarketIds] = useState<string[]>([]);
  const { t } = useTranslation();

  const sortedTickerMarketIds = useMemo(() => {
    return [...marketData]
      .filter((item) => Number(item.markPx || 0) > 0)
      .sort((a, b) => Number(b.dayNtlVlm || 0) - Number(a.dayNtlVlm || 0))
      .slice(0, 12)
      .map((item) => item.name);
  }, [marketData]);

  const sortedTickerMarketKey = useMemo(() => sortedTickerMarketIds.join('|'), [
    sortedTickerMarketIds,
  ]);

  useEffect(() => {
    setTickerMarketIds((prev) => {
      if (sortedTickerMarketIds.length === 0) return [];
      if (
        prev.length === sortedTickerMarketIds.length &&
        prev.every((coin) => sortedTickerMarketIds.includes(coin))
      ) {
        return prev;
      }
      return sortedTickerMarketIds;
    });
  }, [sortedTickerMarketKey, sortedTickerMarketIds]);

  const tickerMarkets = useMemo(() => {
    return tickerMarketIds
      .map((coin) => marketDataMap[coin])
      .filter(Boolean) as MarketData[];
  }, [marketDataMap, tickerMarketIds]);

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
    syncTickerLoopWidth();
  });

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

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tickerLoopRef.current) {
      resizeObserver = new ResizeObserver(() => {
        syncTickerLoopWidth();
      });
      resizeObserver.observe(tickerLoopRef.current);
    }

    return () => {
      window.removeEventListener('resize', syncTickerLoopWidth);
      resizeObserver?.disconnect();
    };
  }, [tickerMarkets.length, syncTickerLoopWidth]);

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
    (item: MarketData, key: string) => {
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
          className="desktop-perps-status-item"
          onClick={() => handleSelectTickerMarket(item.name)}
        >
          <span className="desktop-perps-status-item-name text-rb-neutral-foot">
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
    <div className="fixed bottom-[6px] left-[6px] right-[6px] h-[32px] rounded-[6px] bg-rb-neutral-bg-1 flex items-center overflow-hidden px-[12px] z-30 gap-[12px]">
      <div className="desktop-perps-status-side flex items-center">
        <OnlineStatus online={isConnected} />
      </div>

      <div
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
                renderTickerItem(item, `${item.dexId || 'hyper'}-${item.name}`)
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
  );
};
