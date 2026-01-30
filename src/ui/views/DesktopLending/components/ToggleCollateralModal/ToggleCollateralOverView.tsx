import React from 'react';
import { useTranslation } from 'react-i18next';
import { PopupDetailProps } from '../../types';
import { getHealthFactorText } from '../../utils/health';
import { isHFEmpty } from '../../utils';
import { formatTokenAmount } from '@/ui/utils/number';
import SymbolIcon from '../SymbolIcon';

export const ToggleCollateralOverView: React.FC<
  PopupDetailProps & {
    afterHF?: string;
  }
> = ({ reserve, userSummary, afterHF }) => {
  const { t } = useTranslation();
  const { healthFactor = '0' } = userSummary;

  const showHF = !isHFEmpty(Number(healthFactor || '0'));

  return (
    <div className="w-full mt-16">
      <h3 className="text-[13px] leading-[15px] text-r-neutral-foot mb-8">
        {t('page.lending.popup.title')}
      </h3>
      <div className="rounded-[8px] bg-rb-neutral-card-1">
        <div className="flex items-center justify-between p-16">
          <span className="text-[13px] leading-[15px] text-r-neutral-foot">
            {t('page.lending.supplyDetail.supplyBalance')}
          </span>
          <div className="flex items-center gap-8">
            <SymbolIcon tokenSymbol={reserve.reserve.symbol} size={16} />
            <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
              {formatTokenAmount(reserve.underlyingBalance || '0')}{' '}
              {reserve.reserve.symbol}
            </span>
          </div>
        </div>

        {showHF && (
          <>
            <div className="flex items-center justify-between p-16">
              <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
                {t('page.lending.hfTitle')}
              </span>
              <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
                {afterHF ? (
                  <>
                    {getHealthFactorText(healthFactor)} →{' '}
                    {getHealthFactorText(afterHF)}
                  </>
                ) : (
                  getHealthFactorText(healthFactor)
                )}
              </span>
            </div>
            <div className="flex justify-end p-16 pt-0">
              <span className="text-[12px] leading-[15px] text-r-neutral-foot">
                {t('page.lending.popup.liquidationAt')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
