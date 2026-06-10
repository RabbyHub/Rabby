import React, { useEffect, useMemo } from 'react';
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
  const currentMarketData = useMemo(() => {
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === coin) {
      return wsActiveAssetCtx.ctx;
    }
    return marketDataMap[coin] || {};
  }, [marketDataMap, wsActiveAssetCtx, coin]);

  const location = useLocation();
  const isPerpsRoute = location.pathname.startsWith('/desktop/perps');

  // Update browser tab title with market data
  useEffect(() => {
    const originalTitle = 'Rabby Wallet';
    const markPx = currentMarketData?.markPx;

    if (markPx && isPerpsRoute) {
      const price = splitNumberByStep(Number(markPx));
      const md = currentMarketData as
        | { displayName?: string; quoteAsset?: string }
        | undefined;
      const base = formatPerpsCoin(md?.displayName || coin);
      const quote = md?.quoteAsset || 'USDC';
      document.title = `$${price} | ${base}/${quote} | Rabby`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [coin, currentMarketData?.markPx, isPerpsRoute]);

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

  const calculateChangeValue = (prevDayPx: string, markPx: string) => {
    if (!prevDayPx) return 0;
    return new BigNumber(markPx).minus(new BigNumber(prevDayPx)).toNumber();
  };

  const changeValue = calculateChangeValue(
    currentMarketData.prevDayPx,
    currentMarketData.markPx
  );

  return (
    <div className="flex items-center px-[12px] border-b border-solid border-rb-neutral-line h-[65px] min-w-0">
      {/* Coin Dropdown - Only this area is clickable for dropdown */}
      <CoinDropdown coin={coin} onSelectCoin={onSelectCoin} />

      <div className="mr-[24px] flex flex-col flex-shrink-0 min-w-[96px]">
        <span
          className={clsx(
            'text-[20px] leading-[24px] font-medium',
            changeColorClass
          )}
        >
          {currentMarketData.markPx
            ? splitNumberByStep(Number(currentMarketData.markPx))
            : '-'}
        </span>
        {currentMarketData.markPx && currentMarketData.prevDayPx ? (
          <span
            className={clsx(
              'text-[12px] leading-[14px] font-medium',
              changeColorClass
            )}
          >
            {isPriceUp ? '+' : isPriceDown ? '-' : ''}
            {splitNumberByStep(Math.abs(changeValue))} / {isPriceUp ? '+' : ''}
            {priceChangePercent.toFixed(2)}%
          </span>
        ) : (
          <span className="text-[12px] leading-[14px] text-rb-neutral-secondary">
            -
          </span>
        )}
      </div>

      {/* Market Data - Display only, not clickable */}
      <HorizontalScrollContainer className="flex items-center gap-[24px]">
        <div className="flex flex-col gap-[3px]">
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.markTips')}
              needCursor={false}
              className="text-[12px] leading-[20px] text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.mark')}
            </DashedUnderlineText>
          </div>
          <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
            {currentMarketData.markPx
              ? `$${splitNumberByStep(Number(currentMarketData.markPx))}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.oracleTips')}
              needCursor={false}
              className="text-[12px] leading-[20px] text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.oracle')}
            </DashedUnderlineText>
          </div>
          <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
            {currentMarketData.oraclePx
              ? `$${splitNumberByStep(Number(currentMarketData.oraclePx))}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <span className="text-[12px] leading-[20px] text-rb-neutral-secondary">
            {t('page.perpsPro.chatArea.24hVol')}
          </span>
          <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
            {currentMarketData.dayNtlVlm
              ? `$${splitNumberByStep(
                  Number(currentMarketData.dayNtlVlm).toFixed(2)
                )}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-[3px]">
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.openInterestTips')}
              needCursor={false}
              className="text-[12px] leading-[20px] text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.openInterest')}
            </DashedUnderlineText>
          </div>
          <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
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
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.fundingTips')}
              needCursor={false}
              className="text-[12px] leading-[20px] text-rb-neutral-secondary"
            >
              {t('page.perpsPro.chatArea.fundingCountdown')}
            </DashedUnderlineText>
          </div>
          {currentMarketData.funding ? (
            <span className="text-[12px] leading-[14px] font-medium">
              <span
                className={clsx(
                  'text-[12px] leading-[14px]',
                  Number(currentMarketData.funding) > 0
                    ? 'text-rb-green-default'
                    : 'text-rb-red-default'
                )}
              >
                {formatPercent(Number(currentMarketData.funding), 4)}
              </span>
              <span className="text-[12px] leading-[14px] text-rb-neutral-title-1">
                {' '}
                / {countdown}
              </span>
            </span>
          ) : (
            <span className="text-[12px] leading-[14px] text-rb-neutral-foot">
              -
            </span>
          )}
        </div>
      </HorizontalScrollContainer>
    </div>
  );
};
