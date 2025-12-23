import React, { useMemo } from 'react';
import clsx from 'clsx';
import { PERPS_POSITION_RISK_LEVEL } from '../constants';
import { getRiskLevel, calculateDistanceToLiquidation } from '../utils';
import { splitNumberByStep } from '@/ui/utils';
import { ReactComponent as IconArrowCC } from '@/ui/assets/perps/IconArrowCC.svg';
import { ReactComponent as IconAlarmCC } from '@/ui/assets/perps/icon-alarm-cc.svg';

const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;

interface DistanceToLiquidationTagProps {
  liquidationPrice: string | number | undefined;
  markPrice: string | number | undefined;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}

export const DistanceToLiquidationTag: React.FC<DistanceToLiquidationTagProps> = ({
  liquidationPrice,
  markPrice,
  onPress,
  variant = 'default',
}) => {
  const distanceLiquidation = calculateDistanceToLiquidation(
    liquidationPrice,
    markPrice
  );

  return (
    <div
      className={clsx(
        'flex items-center gap-[2px] px-[6px] h-[18px] border cursor-pointer',
        'border border-rabby-neutral-line rounded-full text-r-neutral-foot',
        variant === 'compact'
          ? 'rounded-[4px] hover:bg-r-blue-light2'
          : 'rounded-[100px]'
      )}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPress?.();
      }}
    >
      <IconAlarmCC />
      <span className={clsx('text-12 font-medium')}>
        {formatPct(distanceLiquidation)}
      </span>
      <IconArrowCC className={clsx('w-8 h-6')} />
    </div>
  );
};

export default DistanceToLiquidationTag;
