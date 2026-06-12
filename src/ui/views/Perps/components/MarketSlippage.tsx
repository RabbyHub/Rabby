import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  PERPS_SLIPPAGE_THRESHOLD,
  PERPS_SLIPPAGE_WARNING,
} from '../slippageUtils';

export interface MarketSlippageProps {
  slippage: number;
  depthInsufficient: boolean;
  /** When provided, the over-threshold banner shows a "switch to limit" action. */
  onSwitchToLimit?: () => void;
  visible?: boolean;
  wrapperClassName?: string;
  rowClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
}

/** Est. Slippage row (value colored <1% neutral / 1%~5% amber / >=5% red) plus a switch-to-limit banner over threshold. */
export const MarketSlippage: React.FC<MarketSlippageProps> = ({
  slippage,
  depthInsufficient,
  onSwitchToLimit,
  visible = true,
  wrapperClassName,
  rowClassName,
  labelClassName,
  valueClassName,
}) => {
  const { t } = useTranslation();
  if (!visible) return null;

  const overThreshold = slippage >= PERPS_SLIPPAGE_THRESHOLD;
  const isWarning = !overThreshold && slippage >= PERPS_SLIPPAGE_WARNING;

  const valueColor = overThreshold
    ? 'text-r-red-default'
    : isWarning
    ? 'text-r-orange-default'
    : 'text-r-neutral-title-1';

  return (
    <div className={wrapperClassName}>
      <div className={clsx('flex items-center justify-between', rowClassName)}>
        <div className={clsx(labelClassName || 'text-13 text-r-neutral-body')}>
          {t('page.perps.expectedSlippage')}
        </div>
        <div
          className={clsx(valueClassName || 'text-13 font-medium', valueColor)}
        >
          {(slippage * 100).toFixed(2)}%
        </div>
      </div>
      {overThreshold && onSwitchToLimit && (
        <div className="mt-8 flex items-center justify-between gap-8 rounded-[8px] bg-r-orange-light px-12 py-8">
          <div className="text-12 leading-[16px] text-r-orange-default">
            {t('page.perps.lowLiquiditySwitchLimit')}
          </div>
          <div
            className="shrink-0 cursor-pointer text-12 px-6 h-[18px] flex items-center font-medium text-r-blue-default bg-r-blue-light-1 rounded-[4px]"
            onClick={onSwitchToLimit}
          >
            {t('page.perps.switchToLimit')}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketSlippage;
