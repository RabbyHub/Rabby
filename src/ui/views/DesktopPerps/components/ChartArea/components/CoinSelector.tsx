import React, { useMemo } from 'react';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { splitNumberByStep } from '@/ui/utils';
import { CoinDropdown } from './CoinDropdown';
import { formatPercent } from '@/ui/views/Perps/utils';
import { useHourlyCountdown } from '@/ui/views/DesktopPerps/hooks/useHourlyCountdown';
import { useTranslation } from 'react-i18next';

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
    return marketDataMap[coin.toUpperCase()];
  }, [marketDataMap, wsActiveAssetCtx, coin]);

  if (!currentMarketData) {
    return null;
  }

  const priceChange = currentMarketData.prevDayPx
    ? Number(currentMarketData.markPx) - Number(currentMarketData.prevDayPx)
    : 0;
  const priceChangePercent = currentMarketData.prevDayPx
    ? (priceChange / Number(currentMarketData.prevDayPx)) * 100
    : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="flex items-center gap-[80px] px-[16px] py-[14px] border-b border-solid border-rb-neutral-line">
      {/* Coin Dropdown - Only this area is clickable for dropdown */}
      <CoinDropdown coin={coin} onSelectCoin={onSelectCoin} />

      {/* Market Data - Display only, not clickable */}
      <div className="flex items-center gap-[24px] flex-1">
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.mark')}
          </span>
          <span className="text-[13px] font-medium text-r-neutral-title-1">
            ${splitNumberByStep(Number(currentMarketData.markPx))}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.oracle')}
          </span>
          <span className="text-[13px] font-medium text-r-neutral-title-1">
            ${splitNumberByStep(Number(currentMarketData.oraclePx))}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.24hChange')}
          </span>
          <span
            className={clsx(
              'text-[13px] font-medium',
              isPositive ? 'text-r-green-default' : 'text-r-red-default'
            )}
          >
            {isPositive ? '+' : ''}${splitNumberByStep(priceChange.toFixed(2))}{' '}
            / {isPositive ? '+' : ''}
            {priceChangePercent.toFixed(2)}%
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.24hVol')}
          </span>
          <span className="text-[13px] font-medium text-r-neutral-title-1">
            ${splitNumberByStep(Number(currentMarketData.dayNtlVlm).toFixed(2))}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.openInterest')}
          </span>
          <span className="text-[13px] font-medium text-r-neutral-title-1">
            $
            {splitNumberByStep(
              (
                Number(currentMarketData.openInterest) *
                Number(currentMarketData.markPx)
              ).toFixed(2)
            )}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-r-neutral-foot">
            {t('page.perpsPro.chatArea.fundingCountdown')}
          </span>
          <span>
            <span
              className={clsx(
                'text-[13px] font-medium',
                Number(currentMarketData.funding) > 0
                  ? 'text-r-green-default'
                  : 'text-r-red-default'
              )}
            >
              {formatPercent(Number(currentMarketData.funding), 4)}
            </span>
            <span className="text-[13px] font-medium text-r-neutral-foot">
              {' '}
              / {countdown}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
