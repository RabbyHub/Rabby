import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupDetailProps } from '../../types';
import { isHFEmpty } from '../../utils';
import { HealthFactorText } from '../HealthFactorText';
import { formatAmount, formatUsdValue } from '../../utils/format';

export const RepayOverView: React.FC<
  PopupDetailProps & {
    amount?: string;
    afterHF?: string;
    afterRepayAmount?: string;
    afterRepayUsdValue?: string;
  }
> = ({
  reserve,
  userSummary,
  amount,
  afterHF,
  afterRepayAmount,
  afterRepayUsdValue,
}) => {
  const { t } = useTranslation();
  const { healthFactor = '0' } = userSummary;

  const showHF = useMemo(() => !isHFEmpty(Number(healthFactor || '0')), [
    healthFactor,
  ]);

  const currentDebtUSDText = useMemo(
    () => formatUsdValue(Number(reserve.variableBorrowsUSD || '0')),
    [reserve.variableBorrowsUSD]
  );

  const afterRepayUsdValueText = useMemo(
    () =>
      afterRepayUsdValue !== undefined
        ? formatUsdValue(Number(afterRepayUsdValue || '0'))
        : null,
    [afterRepayUsdValue]
  );

  return (
    <div className="w-full mt-16">
      <div className="text-[13px] leading-[15px] text-r-neutral-foot mb-8">
        {t('page.lending.popup.title')}
      </div>
      <div className="rounded-[8px] bg-rb-neutral-card-1">
        <div className="flex flex-col gap-2 p-16">
          <div className="flex items-center justify-between">
            <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
              {t('page.lending.popup.remainingDebt')}
            </span>
            <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1 text-right">
              {amount && amount !== '0' && afterRepayAmount !== undefined
                ? `${formatAmount(reserve?.variableBorrows || '0')} ${
                    reserve.reserve.symbol
                  } → ${formatAmount(afterRepayAmount)} ${
                    reserve.reserve.symbol
                  }`
                : `${formatAmount(reserve?.variableBorrows || '0')} ${
                    reserve.reserve.symbol
                  }`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
              {/*{t('page.lending.popup.remainingDebt')} (USD)*/}
            </span>
            <span className="text-[12px] leading-[15px] font-normal text-r-neutral-foot">
              {amount && amount !== '0' && afterRepayUsdValueText
                ? `${currentDebtUSDText} → ${afterRepayUsdValueText}`
                : currentDebtUSDText}
            </span>
          </div>
        </div>

        {showHF && (
          <>
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
                    <HealthFactorText
                      limitless={afterHF === '-1'}
                      healthFactor={afterHF}
                    />
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
          </>
        )}
      </div>
    </div>
  );
};
