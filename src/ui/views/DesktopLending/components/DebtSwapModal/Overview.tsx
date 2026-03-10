import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';

import { SwappableToken } from '../../types/swap';
import { formatApy } from '../../utils/format';
import { HealthFactorText } from '../HealthFactorText';
import SymbolIcon from '../SymbolIcon';

interface DebtSwapOverviewProps {
  fromToken: SwappableToken;
  toToken?: SwappableToken;
  fromAmount: string;
  toAmount: string;
  fromBalanceBn?: string;
  currentToAmount: string;
  isQuoteLoading?: boolean;
  currentHF?: string;
  afterHF?: string;
  showHF?: boolean;
}

const DebtSwapOverview = ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  fromBalanceBn,
  currentToAmount,
  isQuoteLoading,
  currentHF,
  afterHF,
  showHF,
}: DebtSwapOverviewProps) => {
  const { t } = useTranslation();

  const fromBorrowApyDisplay = useMemo(() => {
    if (!fromToken?.variableBorrowAPY) {
      return '-';
    }
    return formatApy(Number(fromToken.variableBorrowAPY || '0'));
  }, [fromToken.variableBorrowAPY]);

  const toBorrowApyDisplay = useMemo(
    () =>
      toToken?.variableBorrowAPY
        ? formatApy(Number(toToken.variableBorrowAPY || '0'))
        : '-',
    [toToken?.variableBorrowAPY]
  );

  const estimatedFromBorrowAfter = useMemo(() => {
    if (!fromBalanceBn) {
      return new BigNumber(0);
    }

    const amountBn = new BigNumber(fromAmount || 0);
    const bigNumberFromBalanceBn = new BigNumber(fromBalanceBn);
    const after = bigNumberFromBalanceBn?.minus(amountBn);
    return after.isNegative() ? new BigNumber(0) : after;
  }, [fromAmount, fromBalanceBn]);

  const estimatedToBorrowAfter = useMemo(() => {
    if (!toToken || isNaN(Number(toAmount))) {
      return new BigNumber(0);
    }

    const currentToAmountBn = new BigNumber(currentToAmount || 0);
    const amountBn = new BigNumber(toAmount || 0);
    const after = currentToAmountBn.plus(amountBn);
    return after.isNegative() ? new BigNumber(0) : after;
  }, [currentToAmount, toAmount, toToken]);

  return (
    <div className="w-full mt-16">
      <div className="mb-8 text-[13px] leading-[15px] text-r-neutral-foot">
        {t('page.lending.debtSwap.overview.title')}
      </div>
      <div className="overflow-hidden rounded-[8px] bg-rb-neutral-card-1">
        <div className="flex items-center justify-between gap-8 px-16 py-16">
          <span className="text-[13px] leading-[16px] text-r-neutral-title-1">
            {t('page.lending.debtSwap.overview.borrowAPY')}
          </span>
          <span className="flex items-center text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
            <span>{fromBorrowApyDisplay}</span>
            <span className="mx-4 text-r-neutral-foot">→</span>
            <span>{toBorrowApyDisplay}</span>
          </span>
        </div>

        {showHF && currentHF ? (
          <>
            <div className="flex items-center justify-between gap-8 px-16 py-16">
              <span className="text-[13px] leading-[16px] text-r-neutral-title-1">
                {t('page.lending.hfTitle')}
              </span>
              <span className="flex items-center text-[13px] leading-[16px] font-medium text-r-neutral-foot">
                {afterHF ? (
                  <>
                    <HealthFactorText
                      limitless={currentHF === '-1'}
                      healthFactor={currentHF}
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
                    healthFactor={currentHF}
                  />
                )}
              </span>
            </div>
          </>
        ) : null}

        <div className="flex items-start justify-between gap-8 px-16 py-16">
          <span className="text-[13px] leading-[16px] text-r-neutral-title-1">
            {t('page.lending.debtSwap.overview.borrowValueAfter')}
          </span>
          <div className="flex flex-col gap-10">
            <div className="flex items-start gap-6">
              <SymbolIcon tokenSymbol={fromToken.symbol} size={16} />
              <div className="flex flex-col items-end gap-2">
                <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
                  {formatTokenAmount(estimatedFromBorrowAfter.toString(10))}
                </span>
                <span className="text-[12px] leading-[14px] text-r-neutral-foot">
                  {estimatedFromBorrowAfter.eq(0)
                    ? '$0'
                    : formatUsdValue(
                        estimatedFromBorrowAfter
                          .multipliedBy(fromToken.usdPrice || '0')
                          .toString(10)
                      )}
                </span>
              </div>
            </div>
            {toToken ? (
              <div
                className={
                  isQuoteLoading
                    ? 'flex items-start gap-6 opacity-50'
                    : 'flex items-start gap-6'
                }
              >
                <SymbolIcon tokenSymbol={toToken.symbol} size={16} />
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[13px] text-right leading-[16px] font-medium text-r-neutral-title-1">
                    {formatTokenAmount(estimatedToBorrowAfter.toString(10))}
                  </span>
                  <span className="text-[12px] text-right leading-[14px] text-r-neutral-foot">
                    {formatUsdValue(
                      estimatedToBorrowAfter
                        .multipliedBy(toToken.usdPrice || '0')
                        .toString(10)
                    )}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtSwapOverview;
