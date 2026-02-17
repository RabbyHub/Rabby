import React, { useMemo } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { DisplayPoolReserveInfo } from '../../types';
import {
  RESERVE_USAGE_BLOCK_THRESHOLD,
  RESERVE_USAGE_WARNING_THRESHOLD,
} from '../../utils/constant';

export const BorrowErrorTip: React.FC<{
  reserve?: DisplayPoolReserveInfo;
  className?: string;
}> = ({ reserve, className }) => {
  const { t } = useTranslation();

  const errorMessage = useMemo(() => {
    if (!reserve) return undefined;
    const { reserve: r } = reserve;
    const totalDebt = new BigNumber(r.totalDebt || '0');
    const borrowCap = new BigNumber(r.borrowCap || '0');

    if (
      r.totalDebt &&
      r.totalDebt !== '0' &&
      r.borrowCap &&
      r.borrowCap !== '0' &&
      totalDebt.gte(borrowCap.multipliedBy(RESERVE_USAGE_BLOCK_THRESHOLD))
    ) {
      return t('page.lending.borrowDetail.almostReachedWarning');
    }

    if (
      r.totalDebt &&
      r.totalDebt !== '0' &&
      r.borrowCap &&
      r.borrowCap !== '0' &&
      totalDebt.gte(borrowCap.multipliedBy(RESERVE_USAGE_WARNING_THRESHOLD))
    ) {
      return t('page.lending.borrowDetail.almostReachedError');
    }
    return undefined;
  }, [reserve, t]);

  if (!errorMessage) return null;

  return (
    <div
      className={`flex items-center gap-2 py-3 px-3 rounded-lg bg-rb-orange-light-1 text-rb-orange-default text-[14px] ${
        className || ''
      }`}
    >
      <span
        className={clsx(
          'flex-shrink-0 w-[18px] h-[18px] rounded-full',
          'flex items-center justify-center',
          'bg-rb-orange-default text-[12px]'
        )}
      >
        !
      </span>
      <span>{errorMessage}</span>
    </div>
  );
};
