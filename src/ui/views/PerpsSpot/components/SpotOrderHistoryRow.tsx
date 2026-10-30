import React from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  formatSpotPrice,
  getSpotMarketDisplayName,
} from '../utils/spotMarkets';
import type { SpotOrderHistoryItem } from '../utils/spotOrderHistory';

const STATUS_CLASS: Record<SpotOrderHistoryItem['status'], string> = {
  filled: 'text-r-green-default',
  canceled: 'text-r-neutral-foot',
  rejected: 'text-r-red-default',
};

export const SpotOrderHistoryRow: React.FC<{
  item: SpotOrderHistoryItem;
  onClick: (item: SpotOrderHistoryItem) => void;
}> = ({ item, onClick }) => {
  const { t } = useTranslation();
  const { market } = item;
  const isBuy = item.side === 'B';
  const filled = Number(item.filledSz);
  const price = item.avgPx
    ? formatSpotPrice(item.avgPx, market.szDecimals)
    : item.limitPx;
  let sizeText: string;
  if (item.status !== 'filled' && filled > 0) {
    sizeText = `${t('page.perpsSpot.filledOf', {
      filled: item.filledSz,
      total: item.origSz,
    })} ${market.baseName}`;
  } else if (item.status === 'filled') {
    sizeText = `${item.filledSz} ${market.baseName}`;
  } else {
    sizeText = `${item.origSz} ${market.baseName}`;
  }

  return (
    <div
      className="flex items-center gap-12 px-12 py-12 rounded-[8px] bg-r-neutral-card1 cursor-pointer"
      onClick={() => onClick(item)}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center gap-6 text-13 font-medium">
          <span
            className={isBuy ? 'text-r-green-default' : 'text-r-red-default'}
          >
            {t(isBuy ? 'page.perpsSpot.buy' : 'page.perpsSpot.sell')}
          </span>
          <span className="text-r-neutral-title-1">
            {getSpotMarketDisplayName(market)}
          </span>
        </div>
        <div className="text-12 text-r-neutral-foot truncate">
          {sizeText} @ {price}
          {item.avgPx ? ` ${t('page.perpsSpot.avgSuffix')}` : ''}
        </div>
      </div>
      <div className="flex flex-col items-end gap-4">
        <span
          className={clsx('text-13 font-medium', STATUS_CLASS[item.status])}
        >
          {t(`page.perpsSpot.status.${item.status}`)}
        </span>
        <span className="text-12 text-r-neutral-foot">
          {dayjs(item.time).format('MM/DD HH:mm')}
        </span>
      </div>
    </div>
  );
};
