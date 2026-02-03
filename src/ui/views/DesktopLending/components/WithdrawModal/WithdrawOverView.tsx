import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupDetailProps } from '../../types';
import { isHFEmpty } from '../../utils';
import { HealthFactorText } from '../HealthFactorText';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';

const formatNetworth = (num: number) => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return formatUsdValue(num);
};

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
    () => formatNetworth(Number(reserve.underlyingBalanceUSD || '0')),
    [reserve.underlyingBalanceUSD]
  );

  const showHF = !isHFEmpty(Number(healthFactor || '0'));

  return (
    <div className="w-full mt-16">
      <div className="text-[13px] leading-[15px] text-r-neutral-foot mb-8">
        {t('page.lending.popup.title')}
      </div>
      <div className="rounded-[8px] bg-rb-neutral-card-1">
        <div className="flex items-center justify-between p-16">
          <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
            {t('page.lending.withdrawDetail.remainingSupply')}
          </span>
          <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1 text-right">
            {amount && amount !== '0' && afterSupply
              ? `${formatTokenAmount(reserve?.underlyingBalance || '0')} ${
                  reserve.reserve.symbol
                } → ${formatTokenAmount(afterSupply.balance)} ${
                  reserve.reserve.symbol
                }`
              : `${formatTokenAmount(reserve?.underlyingBalance || '0')} ${
                  reserve.reserve.symbol
                }`}
          </span>
        </div>

        <div className="flex items-center justify-between p-16">
          <span className="text-[13px] leading-[15px] text-r-neutral-title-1">
            {t('page.lending.supplyDetail.supplyBalance')}
          </span>
          <span className="text-[13px] leading-[15px] font-medium text-r-neutral-title-1">
            {amount && amount !== '0' && afterSupply
              ? `${availableText} → ${formatNetworth(
                  Number(afterSupply.balanceUSD || '0')
                )}`
              : availableText}
          </span>
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
                    <span className="mx-1">→</span>
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
