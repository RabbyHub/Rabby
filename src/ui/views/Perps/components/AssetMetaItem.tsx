import { MarketData } from '@/ui/models/perps';
import clsx from 'clsx';
import React from 'react';
import { TokenImg } from './TokenImg';
import { splitNumberByStep } from '@/ui/utils';
import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { useTranslation } from 'react-i18next';
import { formatPerpsCoin } from '../../DesktopPerps/utils';
const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export const FavoriteTag: React.FC<{
  className?: string;
}> = ({ className }) => (
  <div
    className={clsx(
      'absolute top-0 right-0 w-[36px] h-[15px] flex items-center justify-center rounded-bl-[8px] bg-r-orange-light',
      className
    )}
  >
    <svg
      width="13"
      height="12"
      viewBox="0 0 13 12"
      fill="#FFB020"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6.5 0.5L8.09 3.83L11.75 4.36L9.125 6.92L9.68 10.56L6.5 8.89L3.32 10.56L3.875 6.92L1.25 4.36L4.91 3.83L6.5 0.5Z" />
    </svg>
  </div>
);

export const AssetItem: React.FC<{
  item: MarketData;
  hasPosition?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (coin: string) => void;
  onClick: () => void;
}> = ({ item, hasPosition, isFavorited, onClick }) => {
  const { t } = useTranslation();
  const isUp = Number(item.markPx) - Number(item.prevDayPx) > 0;
  const absPnlUsd = Math.abs(Number(item.markPx) - Number(item.prevDayPx));
  const absPnlPct = Math.abs(absPnlUsd / Number(item.prevDayPx));
  const pnlText = `${isUp ? '+' : '-'}${formatPct(absPnlPct)}`;

  return (
    <div
      className="
        bg-r-neutral-card-1 relative
        flex items-center justify-between cursor-pointer
        hover:bg-r-blue-light-1 px-16 py-12
        rounded-[8px]
        border-[1px]
        border-solid
        border-transparent
        hover:bg-r-blue-light1
        hover:border-rabby-blue-default
        overflow-hidden
      "
      onClick={onClick}
    >
      {isFavorited && <FavoriteTag />}
      <div className="flex items-center gap-10">
        <TokenImg size={32} logoUrl={item.logoUrl} />
        <div className="text-left">
          <div className="flex items-center gap-4">
            <div className="text-15 font-medium text-r-neutral-title-1 mb-2">
              {formatPerpsCoin(item.name)}
            </div>
            {hasPosition && (
              <div className="text-[12px] text-rb-brand-default bg-rb-brand-light-1 px-4 h-[18px] flex items-center justify-center rounded-[4px]">
                {t('page.perps.searchPerpsPopup.onePosition')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-12 text-r-neutral-foot bg-rb-neutral-bg-5 px-4 h-[18px] flex items-center justify-center rounded-[4px]">
              {item.maxLeverage}x
            </div>
            <div className="text-13 text-rb-neutral-secondary">
              VOL: {formatUsdValueKMB(item.dayNtlVlm)}
            </div>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-15 font-medium text-r-neutral-title-1 mb-2">
          ${splitNumberByStep(item.markPx)}
        </div>
        <div
          className={clsx(
            'text-13 font-medium ',
            isUp ? 'text-r-green-default' : 'text-r-red-default'
          )}
        >
          {pnlText}
        </div>
      </div>
    </div>
  );
};
