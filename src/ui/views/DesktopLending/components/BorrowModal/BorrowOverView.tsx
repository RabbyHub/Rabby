import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupDetailProps } from '../../types';
import { getHealthFactorText } from '../../utils/health';
import { isHFEmpty } from '../../utils';

export const BorrowOverView: React.FC<
  PopupDetailProps & {
    afterHF?: string;
  }
> = ({ userSummary, afterHF }) => {
  const { t } = useTranslation();
  const { healthFactor = '0' } = userSummary;

  const showHF = !isHFEmpty(Number(healthFactor || '0'));

  return (
    <div className="w-full mt-16">
      <h3 className="text-[13px] leading-[15px] text-r-neutral-foot mb-8">
        {t('page.lending.popup.title')}
      </h3>
      <div className="rounded-[8px] bg-rb-neutral-card-1">
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
