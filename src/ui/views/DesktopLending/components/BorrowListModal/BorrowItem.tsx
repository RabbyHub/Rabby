import React, { useMemo } from 'react';
import { DisplayPoolReserveInfo } from '../../types';
import clsx from 'clsx';
import SymbolIcon from '../SymbolIcon';
import { formatApy, formatListNetWorth } from '../../utils/format';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { useLendingSummary } from '../../hooks';
import { Tooltip } from 'antd';

export const BorrowItem = ({
  data,
  handlePressItem,
}: {
  data: DisplayPoolReserveInfo;
  handlePressItem: (data: DisplayPoolReserveInfo) => void;
}) => {
  const { t } = useTranslation();
  const { iUserSummary: userSummary } = useLendingSummary();
  const disableBorrowButton = useMemo(() => {
    if (!data) {
      return false;
    }
    // emode开启，但是不支持该池子借贷
    const eModeBorrowDisabled =
      !!userSummary?.userEmodeCategoryId &&
      !data.reserve.eModes.find(
        (e) => e.id === userSummary.userEmodeCategoryId
      );
    if (eModeBorrowDisabled) {
      return true;
    }
    const bgTotalDebt = new BigNumber(data.reserve.totalDebt || '0');
    if (bgTotalDebt.gte(data.reserve.borrowCap || '0')) {
      return true;
    }
    return (
      !userSummary?.availableBorrowsUSD ||
      userSummary?.availableBorrowsUSD === '0'
    );
  }, [
    data,
    userSummary?.availableBorrowsUSD,
    userSummary?.userEmodeCategoryId,
  ]);
  return (
    <div
      key={`${data.reserve.underlyingAsset}-${data.reserve.symbol}`}
      className={clsx(
        'mt-8 flex items-center justify-between px-16 h-[56px] rounded-[12px]',
        'bg-rb-neutral-bg-3'
      )}
    >
      <button
        type="button"
        className="flex-1 flex items-center justify-start min-w-0 text-left"
      >
        <div className="flex items-center gap-8 min-w-0 w-[150px]">
          <SymbolIcon tokenSymbol={data.reserve.symbol} size={24} />
          <span
            className={clsx(
              'text-[13px] leading-[20px] font-medium text-r-neutral-title-1',
              'truncate max-w-[80px]'
            )}
          >
            {data.reserve.symbol}
          </span>
        </div>
        <span
          className={clsx(
            'text-[13px] leading-[18px] font-medium text-r-neutral-title-1 w-[150px]',
            'flex-shrink-0 text-right'
          )}
        >
          {formatListNetWorth(Number(data.reserve.totalDebtUSD || '0'))}
        </span>
        <span
          className={clsx(
            'text-[13px] leading-[20px] font-medium text-r-neutral-title-1 w-[150px]',
            'flex-shrink-0 text-right'
          )}
        >
          {formatApy(Number(data.reserve.variableBorrowAPY || '0'))}
        </span>
      </button>
      {disableBorrowButton &&
      (!userSummary?.availableBorrowsUSD ||
        userSummary?.availableBorrowsUSD === '0') ? (
        <Tooltip
          overlayClassName="rectangle"
          title={t('page.lending.disableBorrowTip.noSupply')}
        >
          <button
            type="button"
            disabled={disableBorrowButton}
            className={clsx(
              'ml-8 min-w-[120px] h-[36px] flex items-center justify-center rounded-[6px] flex-shrink-0',
              'bg-rb-neutral-bg-2 text-[13px] font-medium text-r-neutral-title-1',
              'opacity-50 bg-rb-neutral-bg-4'
            )}
            onClick={(e) => {
              e.stopPropagation();
              handlePressItem(data);
            }}
          >
            <span>{t('page.lending.borrowDetail.actions')}</span>
          </button>
        </Tooltip>
      ) : (
        <button
          type="button"
          disabled={disableBorrowButton}
          className={clsx(
            'ml-8 min-w-[120px] h-[36px] flex items-center justify-center rounded-[6px] flex-shrink-0',
            'bg-rb-neutral-bg-2 text-[13px] font-medium text-r-neutral-title-1',
            !disableBorrowButton &&
              'hover:bg-rb-brand-light-1 hover:text-rb-brand-default',
            disableBorrowButton && 'opacity-50 bg-rb-neutral-bg-4'
          )}
          onClick={(e) => {
            handlePressItem(data);
          }}
        >
          {t('page.lending.borrowDetail.actions')}
        </button>
      )}
    </div>
  );
};
