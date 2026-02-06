import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupDetailProps } from '../../types';
import { isHFEmpty } from '../../utils';
import { HealthFactorText } from '../HealthFactorText';

export const BorrowOverView: React.FC<
  PopupDetailProps & {
    afterHF?: string;
  }
> = ({ userSummary, afterHF }) => {
  const { t } = useTranslation();
  const { healthFactor = '0' } = userSummary;

  return (
    <div className="w-full mt-16">
      <div className="text-[13px] leading-[15px] text-r-neutral-foot mb-8">
        {t('page.lending.popup.title')}
      </div>
      <div className="rounded-[8px] bg-rb-neutral-card-1">
        <div className="flex items-center justify-between p-16 pb-2">
          <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
            {t('page.lending.hfTitle')}
          </span>
          <span className="text-[13px] leading-[15px] font-medium text-r-neutral-foot flex items-center">
            {afterHF ? (
              <>
                <HealthFactorText
                  limitless={healthFactor === '-1'}
                  healthFactor={healthFactor}
                />{' '}
                <span className="mx-4">→</span>
                <HealthFactorText healthFactor={afterHF} />
              </>
            ) : (
              <HealthFactorText
                limitless={healthFactor === '-1'}
                healthFactor={healthFactor}
              />
            )}
          </span>
        </div>
        <div className="flex justify-end p-16 pt-0">
          <span className="text-[12px] leading-[15px] text-r-neutral-foot">
            {t('page.lending.popup.liquidationAt')}
          </span>
        </div>
      </div>
    </div>
  );
};
