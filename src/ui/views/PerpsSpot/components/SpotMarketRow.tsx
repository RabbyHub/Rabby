import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  formatSpotPrice,
  formatSpotSize,
  getSpotMarket24hChange,
} from '../utils/spotMarkets';
import type { SpotMarket } from '../utils/spotMarkets';
import {
  formatSpotPctChange,
  formatSpotVolume,
  getSpotChangeColorClass,
} from './format';
import { SpotTokenLogo } from './SpotTokenLogo';

export const SpotMarketRow: React.FC<{
  market: SpotMarket;
  heldTotal?: string | null;
  onClick: (market: SpotMarket) => void;
}> = ({ market, heldTotal, onClick }) => {
  const { t } = useTranslation();
  const change = getSpotMarket24hChange(market);
  const held =
    heldTotal && Number(heldTotal) > 0
      ? formatSpotSize(heldTotal, market.szDecimals)
      : null;

  return (
    <div
      className={clsx(
        'flex items-center gap-12 px-16 py-12 rounded-[8px] cursor-pointer',
        'bg-r-neutral-card1 border border-transparent hover:border-rabby-blue-default'
      )}
      onClick={() => onClick(market)}
    >
      <SpotTokenLogo baseName={market.baseName} size={32} />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-6 min-w-0">
          <span className="text-15 font-medium text-r-neutral-title-1 truncate">
            {market.baseName}
          </span>
          <span className="px-4 rounded-[4px] bg-r-neutral-card2 text-12 text-r-neutral-foot">
            {market.quoteName}
          </span>
          {held ? (
            <span className="px-4 rounded-[4px] bg-r-blue-light-1 text-12 text-r-blue-default truncate">
              {held}
            </span>
          ) : null}
        </div>
        <div className="text-12 text-r-neutral-foot">
          {t('page.perpsSpot.vol', {
            value: formatSpotVolume(market.dayNtlVlm),
          })}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-15 font-medium text-r-neutral-title-1">
          {market.midPx
            ? formatSpotPrice(market.midPx, market.szDecimals)
            : '-'}
        </span>
        <span className={clsx('text-12', getSpotChangeColorClass(change))}>
          {formatSpotPctChange(change)}
        </span>
      </div>
    </div>
  );
};
