import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupDetailProps } from '../../types';
import { isHFEmpty } from '../../utils';
import { HealthFactorText } from '../HealthFactorText';
import { formatAmount, formatUsdValue } from '../../utils/format';

export const WithdrawOverView: React.FC<
  PopupDetailProps & {
    amount?: string;
    afterHF?: string;
    afterSupply?: {
      balance: string;
      balanceUSD: string;
    };
  }
> = ({ reserve, userSummary, afterHF, afterSupply, amount }) => {
  const { t } = useTranslation();
  const { healthFactor = '0' } = userSummary;

  const availableText = useMemo(
    () => formatUsdValue(Number(reserve.underlyingBalanceUSD || '0')),
    [reserve.underlyingBalanceUSD]
  );

  const showHF = useMemo(() => !isHFEmpty(Number(healthFactor || '0')), [
    healthFactor,
  ]);

  const afterSupplyBalanceUSDText = useMemo(
    () =>
      afterSupply
        ? formatUsdValue(Number(afterSupply.balanceUSD || '0'))
        : null,
    [afterSupply]
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
              {t('page.lending.withdrawDetail.remainingSupply')}
            </span>
            <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1 text-right">
              {amount && amount !== '0' && afterSupply
                ? `${formatAmount(reserve?.underlyingBalance || '0')} ${
                    reserve.reserve.symbol
                  } → ${formatAmount(afterSupply.balance)} ${
                    reserve.reserve.symbol
                  }`
                : `${formatAmount(reserve?.underlyingBalance || '0')} ${
                    reserve.reserve.symbol
                  }`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
              {/*{t('page.lending.supplyDetail.supplyBalance')}*/}
            </span>
            <span className="text-[12px] leading-[15px] font-normal text-r-neutral-foot">
              {amount && amount !== '0' && afterSupplyBalanceUSDText
                ? `${availableText} → ${afterSupplyBalanceUSDText}`
                : availableText}
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
                    <HealthFactorText healthFactor={healthFactor} />{' '}
                    <span className="mx-4">→</span>
                    <HealthFactorText
                      healthFactor={afterHF}
                      limitless={afterHF === '-1'}
                    />
                  </>
                ) : (
                  <HealthFactorText healthFactor={healthFactor} />
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
