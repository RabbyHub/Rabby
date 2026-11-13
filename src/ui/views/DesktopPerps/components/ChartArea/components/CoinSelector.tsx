import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { splitNumberByStep } from '@/ui/utils';
import { CoinDropdown } from './CoinDropdown';
import { formatPercent } from '@/ui/views/Perps/utils';
import { useHourlyCountdown } from '@/ui/views/DesktopPerps/hooks/useHourlyCountdown';
import { useTranslation } from 'react-i18next';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';
import BigNumber from 'bignumber.js';
import { DashedUnderlineText } from '../../DashedUnderlineText';
import { formatPerpsCoin } from '@/ui/views/DesktopPerps/utils';
import { useLocation } from 'react-router-dom';
import {
  getLastTradePrice,
  subscribeLastTradePrice,
} from '../../../lastTradePrice';

const ORIGINAL_TITLE = 'Rabby Wallet';

const PX_FORMAT: BigNumber.Format = {
  decimalSeparator: '.',
  groupSeparator: ',',
  groupSize: 3,
};

// Fixed decimals per market so a price keeps its length between ticks
// (2,415.10 rather than 2,415.1). `toFormat` needs the decimals itself:
// BigNumber drops trailing zeros, so a `toFixed` string loses them again.
const formatFixedPx = (value: string | number, decimals: number) =>
  new BigNumber(value).abs().toFormat(decimals, PX_FORMAT);

type Direction = 'up' | 'down' | 'flat';

/**
 * Direction of the latest price tick: the price compared with the previous
 * price of the same coin, holding the last direction while it is unchanged.
 * A coin's first frame takes `initial` (the 24h direction).
 */
const useTickDirection = (coin: string, price: number, initial: Direction) => {
  const prevRef = useRef<{ coin: string; price: number } | null>(null);
  const [direction, setDirection] = useState<Direction>(initial);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { coin, price };
    if (!price) return;
    if (!prev || prev.coin !== coin || !prev.price) {
      setDirection(initial);
    } else if (price > prev.price) {
      setDirection('up');
    } else if (price < prev.price) {
      setDirection('down');
    }
    // `initial` only seeds a coin's first frame; a later change in the 24h
    // direction must not override the tick direction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin, price]);

  return direction;
};

interface CoinSelectorProps {
  coin: string;
  onSelectCoin: (coin: string) => void;
}

export const CoinSelector: React.FC<CoinSelectorProps> = ({
  coin,
  onSelectCoin,
}) => {
  const { t } = useTranslation();
  const { marketDataMap, wsActiveAssetCtx } = useRabbySelector(
    (state) => state.perps
  );
  const countdown = useHourlyCountdown();
  const marketMeta = marketDataMap[coin];
  const currentMarketData = useMemo(() => {
    const fallbackMarketData = marketDataMap[coin] || {};
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === coin) {
      return {
        ...fallbackMarketData,
        ...wsActiveAssetCtx.ctx,
      };
    }
    return fallbackMarketData;
  }, [marketDataMap, wsActiveAssetCtx, coin]);

  const location = useLocation();
  const isPerpsRoute = location.pathname.startsWith('/desktop/perps');

  // 0 is a valid precision (BTC): no `||`.
  const pxDecimals = marketMeta?.pxDecimals ?? 2;
  const formatPx = (value: string | number) => formatFixedPx(value, pxDecimals);

  // Browser tab title follows the last traded price, like the order book's
  // center price; the mark price only fills in until the first trade arrives.
  // Written straight from the trade feed so it keeps ticking in a background
  // tab, where React's rAF-batched updates pause.
  const markPx = currentMarketData?.markPx;
  const titleBase = formatPerpsCoin(marketMeta?.displayName || coin);
  useEffect(() => {
    if (!isPerpsRoute) {
      document.title = ORIGINAL_TITLE;
      return;
    }
    const render = () => {
      const px = getLastTradePrice(coin) ?? markPx;
      document.title = px
        ? `$${formatFixedPx(px, pxDecimals)} | ${titleBase} | Rabby`
        : ORIGINAL_TITLE;
    };
    render();
    const unsubscribe = subscribeLastTradePrice((latest) => {
      if (latest.coin === coin) render();
    });
    return () => {
      unsubscribe();
      document.title = ORIGINAL_TITLE;
    };
  }, [coin, markPx, isPerpsRoute, titleBase, pxDecimals]);

  const priceChange = currentMarketData.prevDayPx
    ? Number(currentMarketData.markPx) - Number(currentMarketData.prevDayPx)
    : 0;
  const priceChangePercent = currentMarketData.prevDayPx
    ? (priceChange / Number(currentMarketData.prevDayPx)) * 100
    : 0;
  const isPriceUp = priceChange > 0;
  const isPriceDown = priceChange < 0;
  const changeColorClass = isPriceUp
    ? 'text-rb-green-default'
    : isPriceDown
    ? 'text-rb-red-default'
    : 'text-rb-neutral-secondary';

  // The big price is colored by its latest tick; the 24h change line below
  // keeps the 24h sign.
  const tickDirection = useTickDirection(
    coin,
    Number(currentMarketData.markPx || 0),
    isPriceUp ? 'up' : isPriceDown ? 'down' : 'flat'
  );
  const priceColorClass =
    tickDirection === 'up'
      ? 'text-rb-green-default'
      : tickDirection === 'down'
      ? 'text-rb-red-default'
      : 'text-rb-neutral-secondary';

  const calculateChangeValue = (prevDayPx: string, markPx: string) => {
    if (!prevDayPx) return '0';
    return new BigNumber(markPx).minus(new BigNumber(prevDayPx)).toFixed();
  };

  const changeValue = calculateChangeValue(
    currentMarketData.prevDayPx,
    currentMarketData.markPx
  );

  // Hold the price block at the widest it has been for this coin, so a
  // shorter tick (+9.80% after +10.20%) doesn't pull the market stats sideways.
  const priceBlockRef = useRef<HTMLDivElement>(null);
  const [priceBlockMinWidth, setPriceBlockMinWidth] = useState(0);
  useEffect(() => {
    setPriceBlockMinWidth(0);
  }, [coin]);
  useLayoutEffect(() => {
    const el = priceBlockRef.current;
    if (!el) return;
    const contentWidth = Math.max(
      0,
      ...Array.from(el.children).map(
        (child) => (child as HTMLElement).offsetWidth
      )
    );
    if (contentWidth > priceBlockMinWidth) {
      setPriceBlockMinWidth(contentWidth);
    }
  });

  return (
    <div className="flex items-center px-[12px] border-b border-solid border-rb-neutral-line h-[55px] pt-8 pb-10 min-w-0 tabular-nums">
      {/* Coin Dropdown - Only this area is clickable for dropdown */}
      <CoinDropdown coin={coin} onSelectCoin={onSelectCoin} />

      {/* items-start: the lines size to their text so the block can measure it */}
      <div
        ref={priceBlockRef}
        className="mr-[24px] flex flex-col items-start shrink-0 min-w-[96px]"
        style={
          priceBlockMinWidth ? { minWidth: priceBlockMinWidth } : undefined
        }
      >
        <span
          className={clsx(
            'text-[20px] leading-[24px] font-medium',
            priceColorClass
          )}
        >
          {currentMarketData.markPx ? formatPx(currentMarketData.markPx) : '-'}
        </span>
        {currentMarketData.markPx && currentMarketData.prevDayPx ? (
          <span className={clsx('text-12', changeColorClass)}>
            {isPriceUp ? '+' : isPriceDown ? '-' : ''}
            {formatPx(changeValue)} / {isPriceUp ? '+' : ''}
            {priceChangePercent.toFixed(2)}%
          </span>
        ) : (
          <span className="text-12 text-rb-neutral-secondary">-</span>
        )}
      </div>

      {/* Market Data - Display only, not clickable. Tooltips open downward:
          there is no room above the header. */}
      <HorizontalScrollContainer className="flex items-center gap-[24px]">
        <div className="flex flex-col gap-[3px]">
          <div className="flex">
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.markTips')}
              tooltipPlacement="bottom"
              needCursor={false}
              className="text-12 text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.mark')}
            </DashedUnderlineText>
          </div>
          <span className="text-12 text-rb-neutral-body">
            {currentMarketData.markPx
              ? `$${formatPx(currentMarketData.markPx)}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <div className="flex">
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.oracleTips')}
              tooltipPlacement="bottom"
              needCursor={false}
              className="text-12 text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.oracle')}
            </DashedUnderlineText>
          </div>
          <span className="text-12 text-rb-neutral-body">
            {currentMarketData.oraclePx
              ? `$${formatPx(currentMarketData.oraclePx)}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <div className="flex">
            <span className="text-12 text-rb-neutral-secondary">
              {t('page.perpsPro.chatArea.24hVol')}
            </span>
          </div>
          <span className="text-12 text-rb-neutral-body">
            {currentMarketData.dayNtlVlm
              ? `$${splitNumberByStep(
                  Number(currentMarketData.dayNtlVlm).toFixed(2)
                )}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <div className="flex">
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.openInterestTips')}
              tooltipPlacement="bottom"
              needCursor={false}
              className="text-12 text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.openInterest')}
            </DashedUnderlineText>
          </div>
          <span className="text-12 text-rb-neutral-body">
            {currentMarketData.openInterest && currentMarketData.markPx
              ? `$${splitNumberByStep(
                  (
                    Number(currentMarketData.openInterest) *
                    Number(currentMarketData.markPx)
                  ).toFixed(2)
                )}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <div className="flex">
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.fundingTips')}
              tooltipPlacement="bottom"
              needCursor={false}
              className="text-12 text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.fundingCountdown')}
            </DashedUnderlineText>
          </div>
          {currentMarketData.funding ? (
            <span className="text-12">
              <span
                className={clsx(
                  'text-12',
                  Number(currentMarketData.funding) > 0
                    ? 'text-rb-green-default'
                    : 'text-rb-red-default'
                )}
              >
                {formatPercent(Number(currentMarketData.funding), 4)}
              </span>
              <span className="text-12 text-rb-neutral-body">
                {' '}
                / {countdown}
              </span>
            </span>
          ) : (
            <span className="text-12 text-rb-neutral-foot">-</span>
          )}
        </div>
      </HorizontalScrollContainer>
    </div>
  );
};
