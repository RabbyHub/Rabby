import React, { useMemo } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { IsolateTag } from '../IsolateTag';
import { TCell, TRow } from '@/ui/views/CommonPopup/AssetList/components/Table';
import { formatApy } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';
import { DisplayPoolReserveInfo } from '../../types';
import { Tooltip } from 'antd';
import { useLendingSummary } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import {
  shouldDisableDebtSwapEntry,
  shouldShowDebtSwapEntry,
} from '../../utils/swapAction';

export const BorrowItem: React.FC<{
  data: DisplayPoolReserveInfo;
  onBorrow?: (data: DisplayPoolReserveInfo) => void;
  onRepay?: (data: DisplayPoolReserveInfo) => void;
  onSwap?: (data: DisplayPoolReserveInfo) => void;
}> = ({ data, onBorrow, onRepay, onSwap }) => {
  const { t } = useTranslation();
  const {
    iUserSummary: userSummary,
    formattedPoolReservesAndIncentives,
  } = useLendingSummary();
  const { selectedMarketData } = useSelectedMarket();

  const apy = useMemo(() => {
    return formatApy(Number(data.reserve.variableBorrowAPY));
  }, [data.reserve.variableBorrowAPY]);

  const totalBorrowsUSD = useMemo(() => {
    return formatUsdValue(Number(data.totalBorrowsUSD), BigNumber.ROUND_DOWN);
  }, [data.totalBorrowsUSD]);

  const disableBorrowButton = useMemo(() => {
    return (
      !userSummary?.availableBorrowsUSD ||
      userSummary?.availableBorrowsUSD === '0'
    );
  }, [userSummary?.availableBorrowsUSD]);

  const showDebtSwapButton = useMemo(
    () =>
      shouldShowDebtSwapEntry({
        reserve: data,
        market: selectedMarketData,
      }),
    [data, selectedMarketData]
  );

  const disableDebtSwapButton = useMemo(
    () =>
      shouldDisableDebtSwapEntry({
        reserve: data,
        userSummary,
        reserves: formattedPoolReservesAndIncentives,
      }),
    [data, formattedPoolReservesAndIncentives, userSummary]
  );

  return (
    <TRow
      className={clsx('px-[16px] py-[12px] bg-rb-neutral-bg-3 rounded-[12px]')}
    >
      <TCell className="flex-1 min-w-0">
        <div className="flex items-center gap-[32px]">
          <div className="flex items-center gap-[8px] flex-shrink-0 min-w-[180px]">
            {data.reserve.symbol && (
              <SymbolIcon tokenSymbol={data.reserve.symbol} size={24} />
            )}
            <div className="flex items-center gap-[6px]">
              <span className="text-[14px] leading-[17px] font-semibold text-r-neutral-title-1">
                {data.reserve.symbol}
              </span>
              {data.reserve.isIsolated && <IsolateTag />}
            </div>
          </div>
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium flex-shrink-0 min-w-[120px]',
              'text-rb-red-default'
            )}
          >
            {t('page.lending.type.borrowed')}
          </span>
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium flex-shrink-0 min-w-[120px]',
              'text-r-neutral-foot'
            )}
          >
            {apy}
          </span>
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium text-r-neutral-title-1',
              'flex-shrink-0 min-w-[100px]'
            )}
          >
            {totalBorrowsUSD}
          </span>
        </div>
      </TCell>
      <TCell className="w-[88px] flex-shrink-0">
        <div className="flex items-center justify-start">
          <span />
        </div>
      </TCell>
      <TCell
        className={clsx(
          'flex-shrink-0',
          showDebtSwapButton ? 'w-[430px]' : 'w-[300px]'
        )}
      >
        <div className="flex items-center justify-end gap-[10px]">
          {showDebtSwapButton ? (
            <button
              onClick={() => onSwap?.(data)}
              className={clsx(
                'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                'bg-rb-neutral-bg-4 text-r-neutral-title-1',
                'hover:bg-rb-brand-light-1',
                'flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50'
              )}
              disabled={disableDebtSwapButton}
            >
              {t('page.lending.actions.swap')}
            </button>
          ) : null}
          {disableBorrowButton ? (
            <Tooltip
              overlayClassName="rectangle"
              title={t('page.lending.disableBorrowTip.noSupply')}
            >
              <button
                onClick={() => onBorrow?.(data)}
                className={clsx(
                  'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                  'bg-rb-neutral-bg-4 text-r-neutral-title-1 opacity-50',
                  'flex items-center justify-center'
                )}
                disabled
              >
                <span>{t('page.lending.actions.borrow')}</span>
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={() => onBorrow?.(data)}
              className={clsx(
                'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                'bg-rb-neutral-bg-4 text-r-neutral-title-1',
                'hover:bg-rb-brand-light-1',
                'flex items-center justify-center'
              )}
            >
              {t('page.lending.actions.borrow')}
            </button>
          )}
          <button
            onClick={() => onRepay?.(data)}
            className={clsx(
              'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
              'bg-rb-neutral-bg-4 text-r-neutral-title-1',
              'hover:bg-rb-brand-light-1',
              'flex items-center justify-center'
            )}
          >
            {t('page.lending.actions.repay')}
          </button>
        </div>
      </TCell>
    </TRow>
  );
};
