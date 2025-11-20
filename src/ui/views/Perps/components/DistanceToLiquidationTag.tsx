import React, { useMemo } from 'react';
import clsx from 'clsx';
import { PERPS_POSITION_RISK_LEVEL } from '../constants';
import { getRiskLevel, calculateDistanceToLiquidation } from '../utils';
import { splitNumberByStep } from '@/ui/utils';
import { ReactComponent as IconArrowCC } from '@/ui/assets/perps/IconArrowCC.svg';

const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;

interface DistanceToLiquidationTagProps {
  liquidationPrice: string | number | undefined;
  markPrice: string | number | undefined;
  onPress?: () => void;
}

export const DistanceToLiquidationTag: React.FC<DistanceToLiquidationTagProps> = ({
  liquidationPrice,
  markPrice,
  onPress,
}) => {
  const distanceLiquidation = calculateDistanceToLiquidation(
    liquidationPrice,
    markPrice
  );

  const riskLevel = useMemo(() => {
    return getRiskLevel(distanceLiquidation);
  }, [distanceLiquidation]);

  const riskColorClass = useMemo(() => {
    const colorMap = {
      [PERPS_POSITION_RISK_LEVEL.DANGER]: {
        container: 'bg-rb-red-light-1 border-rb-red-light-2',
        dot: 'bg-rb-red-light-2',
        innerDot: 'bg-rb-red-default',
        text: 'text-rb-red-default',
      },
      [PERPS_POSITION_RISK_LEVEL.WARNING]: {
        container: 'bg-rb-orange-light-1 border-rb-orange-light-2',
        dot: 'bg-rb-orange-light-2',
        innerDot: 'bg-rb-orange-default',
        text: 'text-rb-orange-default',
      },
      [PERPS_POSITION_RISK_LEVEL.SAFE]: {
        container: 'bg-rb-green-light-4 border-rb-green-disable',
        dot: 'bg-rb-green-disable',
        innerDot: 'bg-rb-green-default',
        text: 'text-rb-green-default',
      },
    };
    return colorMap[riskLevel];
  }, [riskLevel]);

  return (
    <div
      className={clsx(
        'flex items-center gap-4 rounded-[100px] px-4 pl-6 h-[18px] border cursor-pointer',
        riskColorClass.container
      )}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPress?.();
      }}
    >
      <div
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center',
          riskColorClass.dot
        )}
      >
        <div
          className={clsx('w-4 h-4 rounded-full', riskColorClass.innerDot)}
        />
      </div>
      <span className={clsx('text-12 font-medium', riskColorClass.text)}>
        {formatPct(distanceLiquidation)}
      </span>
      <IconArrowCC className={clsx('w-8 h-6', riskColorClass.text)} />
    </div>
  );
};

export default DistanceToLiquidationTag;
