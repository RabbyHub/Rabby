import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TokenImg } from '../../Perps/components/TokenImg';
import { getPositionDirection } from '../utils';
import BigNumber from 'bignumber.js';

interface PerpsPositionCardProps {
  position: PositionAndOpenOrder['position'];
  marketData: MarketData;
  isShowPnl?: boolean;
}
export const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  marketData,
  isShowPnl = true,
}) => {
  const { t } = useTranslation();

  const direction = getPositionDirection(position);

  return (
    <div className="flex items-center justify-between p-12 mb-12 h-[78px] bg-r-neutral-card1 rounded-[8px]">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-6">
          <TokenImg logoUrl={marketData?.logoUrl} size={28} />
          <span className="text-[16px] font-medium text-r-neutral-title-1">
            {position.coin}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={clsx(
              'px-4 h-[18px] rounded-[4px] text-12 font-medium flex items-center justify-center',
              direction === 'Long'
                ? 'bg-r-green-light text-r-green-default'
                : 'bg-r-red-light text-r-red-default'
            )}
          >
            {direction} {position.leverage.value}x
          </div>
          {/* <DistanceToLiquidationTag
            liquidationPrice={liquidationPx}
            markPrice={markPrice}
          /> */}
        </div>
      </div>
      <div className="flex flex-col items-end gap-5">
        <div>
          <span className="text-[15px] leading-[20px] font-bold text-r-neutral-title-1">
            {formatUsdValue(position.marginUsed || 0)}
          </span>
          <span>
            (
            {splitNumberByStep(
              new BigNumber(position.szi || '0').abs().toFixed()
            )}{' '}
            {position.coin})
          </span>
        </div>
        {isShowPnl ? (
          <span
            className={clsx(
              'text-[13px] leading-[18px] font-medium',
              Number(position.unrealizedPnl) >= 0
                ? 'text-r-green-default'
                : 'text-r-red-default'
            )}
          >
            {Number(position.unrealizedPnl) >= 0 ? '+' : '-'}$
            {splitNumberByStep(
              Math.abs(Number(position.unrealizedPnl || 0)).toFixed(2)
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
};
