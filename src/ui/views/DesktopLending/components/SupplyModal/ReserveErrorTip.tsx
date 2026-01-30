import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { DisplayPoolReserveInfo } from '../../types';
import { RESERVE_USAGE_WARNING_THRESHOLD } from '../../utils/constant';
import { formatUsdValue } from '@/ui/utils/number';

export const ReserveErrorTip: React.FC<{
  reserve?: DisplayPoolReserveInfo;
  className?: string;
}> = ({ reserve, className }) => {
  const { t } = useTranslation();

  const errorMessage = useMemo(() => {
    if (!reserve) return undefined;
    const { reserve: r } = reserve;
    const totalLiquidity = new BigNumber(r.totalLiquidity || '0');
    const supplyCap = new BigNumber(r.supplyCap || '0');
    const supplyCapUSD = new BigNumber(r.supplyCapUSD || '0');
    const totalLiquidityUSD = new BigNumber(r.totalLiquidityUSD || '0');
    if (
      r.totalLiquidity &&
      r.totalLiquidity !== '0' &&
      r.supplyCap &&
      r.supplyCap !== '0' &&
      totalLiquidity.gte(supplyCap)
    ) {
      return t('page.lending.supplyOverview.reachCap');
    }
    if (
      r.totalLiquidity &&
      r.totalLiquidity !== '0' &&
      r.supplyCap &&
      r.supplyCap !== '0' &&
      totalLiquidity.gte(
        supplyCap.multipliedBy(RESERVE_USAGE_WARNING_THRESHOLD)
      )
    ) {
      const available = supplyCapUSD.minus(totalLiquidityUSD).toString();
      return t('page.lending.supplyOverview.almostCap', {
        available: formatUsdValue(Number(available)),
      });
    }
    return undefined;
  }, [reserve, t]);

  if (!errorMessage) return null;

  return (
    <div
      className={`flex items-center gap-2 py-3 px-3 rounded-lg bg-rb-red-light-1 text-rb-red-default text-[14px] ${
        className || ''
      }`}
    >
      <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full bg-rb-red-default/20 flex items-center justify-center text-[12px]">
        !
      </span>
      <span>{errorMessage}</span>
    </div>
  );
};
