import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TokenImg } from '../../Perps/components/TokenImg';
import BigNumber from 'bignumber.js';
import { PositionFormatData } from './UserInfoHistory/PositionsInfo';
import { DistanceRiskTag } from './UserInfoHistory/PositionsInfo/DistanceRiskTag';

interface PerpsPositionCardProps {
  position: PositionFormatData;
  marketData: MarketData;
  isShowPnl?: boolean;
}
export const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  marketData,
  isShowPnl = true,
}) => {
  const { t } = useTranslation();

  const direction = position.direction;

  return (
    <div className="flex items-center justify-between p-12 mb-12 h-[78px] bg-r-neutral-card1 rounded-[8px]">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-6">
          <TokenImg logoUrl={marketData?.logoUrl} size={28} />
          <span className="text-[16px] font-bold text-rb-neutral-title-1">
            {position.coin}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={clsx(
              'px-4 h-[18px] rounded-[4px] text-12 font-medium flex items-center justify-center',
              direction === 'Long'
                ? 'bg-rb-green-light-1 text-rb-green-default'
                : 'bg-rb-red-light-1 text-rb-red-default'
            )}
          >
            {direction} {position.leverage}x
          </div>
          <DistanceRiskTag
            isLong={direction === 'Long'}
            percent={position.liquidationDistancePercent}
          />
        </div>
      </div>
      <div className="flex flex-col items-end gap-4">
        <div className="flex flex-row gap-4">
          <span className="text-[16px] leading-[20px] font-bold text-rb-neutral-title-1">
            {formatUsdValue(position.marginUsed || 0)}
          </span>
          <span className="text-[16px] leading-[20px] font-medium text-rb-neutral-foot">
            (
            {splitNumberByStep(
              new BigNumber(position.size || '0').abs().toFixed()
            )}{' '}
            {position.coin})
          </span>
        </div>
        {isShowPnl ? (
          <span
            className={clsx(
              'text-[14px] leading-[18px] font-medium',
              Number(position.unrealizedPnl) >= 0
                ? 'text-rb-green-default'
                : 'text-rb-red-default'
            )}
          >
            {Number(position.unrealizedPnl) >= 0 ? '+' : '-'}$
            {splitNumberByStep(
              Math.abs(Number(position.unrealizedPnl || 0)).toFixed(2)
            )}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
};
