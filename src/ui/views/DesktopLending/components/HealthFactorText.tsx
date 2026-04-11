import React from 'react';
import clsx from 'clsx';
import { getHealthFactorText } from '../utils/health';
import { getHealthStatusColor } from '../utils';

export const HealthFactorText = ({
  healthFactor,
  limitless,
}: {
  healthFactor: string;
  limitless?: boolean;
}) => {
  return (
    <div
      className={clsx('text-[13px] leading-[13px] font-medium')}
      style={{
        color: limitless
          ? 'var(--rb-green-default)'
          : getHealthStatusColor(Number(healthFactor)).color,
      }}
    >
      {limitless ? ' ∞' : getHealthFactorText(healthFactor)}
    </div>
  );
};
