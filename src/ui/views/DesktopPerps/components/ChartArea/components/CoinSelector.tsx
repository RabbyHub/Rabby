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
    if (
      wsActiveAssetCtx &&
      wsActiveAssetCtx.coin.toUpperCase() === coin.toUpperCase()
    ) {
      return wsActiveAssetCtx.ctx;
    }
    return marketDataMap[coin.toUpperCase()] || {};
  }, [marketDataMap, wsActiveAssetCtx, coin]);

  // Update browser tab title with market data
  useEffect(() => {
    const originalTitle = 'Rabby Wallet';
    const markPx = currentMarketData?.markPx;

    if (markPx) {
      const price = splitNumberByStep(Number(markPx));
      document.title = `$${price} | ${coin}-USD | Rabby`;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [coin, currentMarketData?.markPx]);

  const priceChange = currentMarketData.prevDayPx
    ? Number(currentMarketData.markPx) - Number(currentMarketData.prevDayPx)
    : 0;
  const priceChangePercent = currentMarketData.prevDayPx
    ? (priceChange / Number(currentMarketData.prevDayPx)) * 100
    : 0;
  const isPositive = priceChange >= 0;

  const calculateChangeValue = (prevDayPx: string, markPx: string) => {
    if (!prevDayPx) return 0;
    return new BigNumber(markPx).minus(new BigNumber(prevDayPx)).toNumber();
  };

  const changeValue = calculateChangeValue(
    currentMarketData.prevDayPx,
    currentMarketData.markPx
  );

  return (
    <div className="flex items-center px-[16px] py-[4px] border-b border-solid border-rb-neutral-line">
      {/* Coin Dropdown - Only this area is clickable for dropdown */}
      <CoinDropdown coin={coin} onSelectCoin={onSelectCoin} />

      {/* Market Data - Display only, not clickable */}
      <HorizontalScrollContainer className="flex items-center gap-24">
        <div className="flex flex-col">
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.markTips')}
              needCursor={false}
              className="text-[12px] leading-[18px] text-r-neutral-foot"
            >
              {t('page.perpsPro.chatArea.mark')}
            </DashedUnderlineText>
          </div>
          <span className="text-[12px] leading-[18px] text-r-neutral-title-1">
            {currentMarketData.markPx
              ? `$${splitNumberByStep(Number(currentMarketData.markPx))}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col">
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.oracleTips')}
              needCursor={false}
              className="text-[12px] leading-[18px] text-r-neutral-foot"
            >
              {t('page.perpsPro.chatArea.oracle')}
            </DashedUnderlineText>
          </div>
          <span className="text-[12px] leading-[18px] text-r-neutral-title-1">
            {currentMarketData.oraclePx
              ? `$${splitNumberByStep(Number(currentMarketData.oraclePx))}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[12px] leading-[18px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.24hChange')}
          </span>
          {currentMarketData.markPx && currentMarketData.prevDayPx ? (
            <span
              className={clsx(
                'text-[12px] leading-[18px] font-medium',
                isPositive ? 'text-r-green-default' : 'text-r-red-default'
              )}
            >
              {isPositive ? '+' : '-'}
              {`$${splitNumberByStep(Math.abs(changeValue))}`} /{' '}
              {isPositive ? '+' : ''}
              {priceChangePercent.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[13px] leading-[18px] font-medium text-r-neutral-foot">
              -
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-[12px] leading-[18px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.24hVol')}
          </span>
          <span className="text-[12px] leading-[18px] text-r-neutral-title-1">
            {currentMarketData.dayNtlVlm
              ? `$${splitNumberByStep(
                  Number(currentMarketData.dayNtlVlm).toFixed(2)
                )}`
              : '-'}
          </span>
        </div>

        <div className="flex flex-col">
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.openInterestTips')}
              needCursor={false}
              className="text-[12px] leading-[18px] text-r-neutral-foot"
            >
              {t('page.perpsPro.chatArea.openInterest')}
            </DashedUnderlineText>
          </div>
          <span className="text-[12px] leading-[18px] text-r-neutral-title-1">
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

        <div className="flex flex-col">
          <div>
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.chatArea.fundingTips')}
              needCursor={false}
              className="text-[12px] leading-[18px] text-r-neutral-foot"
            >
              {t('page.perpsPro.chatArea.fundingCountdown')}
            </DashedUnderlineText>
          </div>
          {currentMarketData.funding ? (
            <span className="text-[12px] leading-[18px]">
              <span
                className={clsx(
                  'text-[12px] leading-[18px]',
                  Number(currentMarketData.funding) > 0
                    ? 'text-r-green-default'
                    : 'text-r-red-default'
                )}
              >
                {formatPercent(Number(currentMarketData.funding), 4)}
              </span>
              <span className="text-[12px] leading-[18px] text-r-neutral-foot">
                {' '}
                / {countdown}
              </span>
            </span>
          ) : (
            <span className="text-[12px] leading-[18px] text-r-neutral-foot">
              -
            </span>
          )}
        </div>
      </HorizontalScrollContainer>
    </div>
  );
};
