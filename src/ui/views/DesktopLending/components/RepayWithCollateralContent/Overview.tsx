import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';

import { SwappableToken } from '../../types/swap';
import { HealthFactorText } from '../HealthFactorText';
import SymbolIcon from '../SymbolIcon';

interface RepayWithCollateralOverviewProps {
  fromToken?: SwappableToken;
  toToken: SwappableToken;
  fromAmount: string;
  toAmount: string;
  fromBalanceBn?: string;
  isQuoteLoading?: boolean;
  currentToAmount: string;
  currentHF?: string;
  afterHF?: string;
}

const RepayWithCollateralOverview = ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  fromBalanceBn,
  isQuoteLoading,
  currentToAmount,
  currentHF,
  afterHF,
}: RepayWithCollateralOverviewProps) => {
  const { t } = useTranslation();

  const estimatedCollateralAfter = useMemo(() => {
    if (!fromBalanceBn) {
      return new BigNumber(0);
    }

    const amountBn = new BigNumber(fromAmount || 0);
    const balanceBn = new BigNumber(fromBalanceBn);
    const after = balanceBn.minus(amountBn);

    return after.isNegative() ? new BigNumber(0) : after;
  }, [fromAmount, fromBalanceBn]);

  const estimatedBorrowAfter = useMemo(() => {
    if (!toToken || isNaN(Number(toAmount))) {
      return new BigNumber(0);
    }

    const currentToAmountBn = new BigNumber(currentToAmount || 0);
    const amountBn = new BigNumber(toAmount || 0);
    const after = currentToAmountBn.minus(amountBn);

    return after.isNegative() ? new BigNumber(0) : after;
  }, [currentToAmount, toAmount, toToken]);

  if (!fromToken) {
    return null;
  }

  return (
    <div className="w-full mt-16">
      <div className="mb-8 text-[13px] leading-[15px] text-r-neutral-foot">
        {t('page.lending.repayWithCollateral.overview.title')}
      </div>
      <div className="overflow-hidden rounded-[8px] bg-rb-neutral-card-1">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-8 px-16 py-16">
            <span className="text-[13px] leading-[16px] text-r-neutral-title-1">
              {t('page.lending.hfTitle')}
            </span>
            <span className="flex items-center text-[13px] leading-[16px] font-medium text-r-neutral-foot">
              {afterHF && toAmount !== '0' ? (
                <>
                  <HealthFactorText
                    limitless={currentHF === '-1'}
                    healthFactor={currentHF || '0'}
                  />
                  <span className="mx-4">→</span>
                  <HealthFactorText
                    limitless={afterHF === '-1'}
                    healthFactor={afterHF}
                  />
                </>
              ) : (
                <HealthFactorText
                  limitless={currentHF === '-1'}
                  healthFactor={currentHF || '0'}
                />
              )}
            </span>
          </div>

          <div className="flex items-start justify-between gap-8 px-16 py-16">
            <span className="text-[13px] leading-[16px] text-r-neutral-title-1">
              {t('page.lending.repayWithCollateral.overview.borrowValueAfter')}
            </span>
            <div
              className={
                isQuoteLoading
                  ? 'flex items-start justify-end gap-6 opacity-50'
                  : 'flex items-start justify-end gap-6'
              }
            >
              <SymbolIcon tokenSymbol={toToken.symbol} size={16} />
              <div className="flex flex-col items-end gap-2">
                <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
                  {formatTokenAmount(estimatedBorrowAfter.toString(10))}
                </span>
                <span className="text-[12px] leading-[14px] text-r-neutral-foot">
                  {formatUsdValue(
                    estimatedBorrowAfter
                      .multipliedBy(toToken.usdPrice || '0')
                      .toString(10)
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-8 px-16 py-16">
            <span className="text-[13px] leading-[16px] text-r-neutral-title-1">
              {t(
                'page.lending.repayWithCollateral.overview.collateralValueAfter'
              )}
            </span>
            <div className="flex items-start gap-6">
              <SymbolIcon tokenSymbol={fromToken.symbol} size={16} />
              <div className="flex flex-col items-end gap-2">
                <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
                  {formatTokenAmount(estimatedCollateralAfter.toString(10))}
                </span>
                <span className="text-[12px] leading-[14px] text-r-neutral-foot">
                  {estimatedCollateralAfter.eq(0)
                    ? '$0'
                    : formatUsdValue(
                        estimatedCollateralAfter
                          .multipliedBy(fromToken.usdPrice || '0')
                          .toString(10)
                      )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepayWithCollateralOverview;
