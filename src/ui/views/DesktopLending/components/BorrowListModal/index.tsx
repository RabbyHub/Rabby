import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { isSameAddress } from '@/ui/utils';
import {
  useLendingRemoteData,
  useLendingSummary,
  useSelectedMarket,
  useLendingIsLoading,
} from '../../hooks';
import { DisplayPoolReserveInfo } from '../../types';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import { assetCanBeBorrowedByUser } from '../../utils/borrow';
import { formatApy, formatListNetWorth } from '../../utils/format';
import { isUnFoldToken } from '../../config/unfold';
import SymbolIcon from '../SymbolIcon';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';

type BorrowListModalProps = {
  onSelect: (reserve: DisplayPoolReserveInfo) => void;
  onCancel: () => void;
};

type BorrowListItem =
  | { type: 'reserve'; data: DisplayPoolReserveInfo }
  | { type: 'toggle_fold' };

export const BorrowListModal: React.FC<BorrowListModalProps> = ({
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { reserves } = useLendingRemoteData();
  const { loading } = useLendingIsLoading();
  const {
    displayPoolReserves,
    iUserSummary,
    getTargetReserve,
  } = useLendingSummary();
  const { marketKey } = useSelectedMarket();

  const [foldHideList, setFoldHideList] = useState(true);

  const isInIsolationMode = useMemo(() => !!iUserSummary?.isInIsolationMode, [
    iUserSummary?.isInIsolationMode,
  ]);

  const sortReserves = useMemo(() => {
    return (displayPoolReserves ?? [])
      .filter((item) => {
        if (isSameAddress(item.underlyingAsset, API_ETH_MOCK_ADDRESS)) {
          return false;
        }
        if (item.variableBorrows && item.variableBorrows !== '0') {
          return true;
        }
        const eModeBorrowDisabled =
          !!iUserSummary?.userEmodeCategoryId &&
          !item.reserve.eModes?.find(
            (e) => e.id === iUserSummary.userEmodeCategoryId
          );
        if (eModeBorrowDisabled) return false;
        const reserve = reserves?.reservesData?.find((x) =>
          isSameAddress(x.underlyingAsset, item.reserve.underlyingAsset)
        );
        if (!reserve || !iUserSummary) return false;
        return assetCanBeBorrowedByUser(
          reserve,
          iUserSummary,
          item.reserve.eModes
        );
      })
      .sort((a, b) => {
        return Number(b.reserve.totalDebtUSD) - Number(a.reserve.totalDebtUSD);
      });
  }, [displayPoolReserves, iUserSummary, reserves?.reservesData]);

  const listReserves = sortReserves ?? [];

  const unFoldList = useMemo(
    () =>
      listReserves.filter((item) =>
        isUnFoldToken(marketKey, item.reserve.symbol)
      ),
    [listReserves, marketKey]
  );

  const foldList = useMemo(
    () =>
      listReserves.filter(
        (item) => !isUnFoldToken(marketKey, item.reserve.symbol)
      ),
    [listReserves, marketKey]
  );

  const dataList = useMemo<BorrowListItem[]>(() => {
    if (loading) return [];
    const list: BorrowListItem[] = [];
    unFoldList.forEach((item) => list.push({ type: 'reserve', data: item }));
    if (foldList.length) {
      list.push({ type: 'toggle_fold' });
      if (!foldHideList) {
        foldList.forEach((item) => list.push({ type: 'reserve', data: item }));
      }
    }
    return list;
  }, [foldHideList, foldList, loading, unFoldList]);

  const desc = useMemo(() => {
    if (
      iUserSummary?.availableBorrowsUSD === '0' ||
      !iUserSummary?.availableBorrowsUSD
    ) {
      return t('page.lending.availableCard.needSupply');
    }
    if (iUserSummary?.userEmodeCategoryId !== 0) {
      if (!listReserves.length) {
        return t('page.lending.availableCard.emodeNoAssets');
      }
      return t('page.lending.availableCard.emode');
    }
    if (isInIsolationMode) {
      return t('page.lending.availableCard.isolated');
    }
    return t('page.lending.availableCard.canBorrow');
  }, [
    iUserSummary?.availableBorrowsUSD,
    iUserSummary?.userEmodeCategoryId,
    isInIsolationMode,
    listReserves.length,
    t,
  ]);

  const availableCard = useMemo(() => {
    if (loading || !iUserSummary?.totalLiquidityUSD) return null;
    const showOrange = isInIsolationMode || !!iUserSummary?.userEmodeCategoryId;
    return (
      <div
        className={`mt-8 px-12 py-14 rounded-[6px] gap-2 ${
          showOrange ? 'bg-rb-orange-light-1' : 'bg-rb-neutral-bg-5'
        }`}
      >
        <div className="flex items-center gap-4">
          {(iUserSummary?.availableBorrowsUSD === '0' ||
            !iUserSummary?.availableBorrowsUSD ||
            isInIsolationMode) && (
            <RcIconWarningCC
              viewBox="0 0 16 16"
              className={`w-14 h-14 flex-shrink-0 ${
                isInIsolationMode
                  ? 'text-rb-orange-default'
                  : 'text-r-neutral-info'
              }`}
            />
          )}
          <span
            className={`text-[14px] leading-[18px] font-medium ${
              showOrange ? 'text-rb-orange-default' : 'text-r-neutral-title-1'
            }`}
          >
            {t('page.lending.modalDesc.availableToBorrow')}:{' '}
            <span className={showOrange ? 'text-rb-orange-default' : ''}>
              {formatListNetWorth(
                Number(iUserSummary?.availableBorrowsUSD || '0')
              )}
            </span>
          </span>
        </div>
        <p
          className={`text-[14px] leading-[18px] mt-2 ${
            showOrange ? 'text-rb-orange-default' : 'text-r-neutral-foot'
          }`}
        >
          {desc}
        </p>
      </div>
    );
  }, [
    desc,
    iUserSummary?.availableBorrowsUSD,
    iUserSummary?.totalLiquidityUSD,
    iUserSummary?.userEmodeCategoryId,
    isInIsolationMode,
    loading,
    t,
  ]);

  const handlePressItem = useCallback(
    (item: DisplayPoolReserveInfo) => {
      const reserve = getTargetReserve(item.reserve.underlyingAsset);
      if (!reserve || !iUserSummary) return;
      onSelect(reserve);
    },
    [getTargetReserve, iUserSummary, onSelect]
  );

  return (
    <div
      className={clsx(
        'w-full h-full min-h-0 flex flex-col',
        'bg-r-neutral-bg-2 rounded-[12px] p-[24px] pb-8'
      )}
    >
      <h2 className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1 mb-12">
        {t('page.lending.borrowDetail.actions')}
      </h2>
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-32 text-r-neutral-foot">
          Loading...
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          {availableCard}
          {listReserves.length > 0 && (
            <>
              <div className="mt-16 mb-2 flex items-center justify-between px-8">
                <span className="text-[14px] leading-[18px] text-r-neutral-foot flex-1">
                  {t('page.lending.list.headers.token')}
                </span>
                <span
                  className={clsx(
                    'text-[14px] leading-[18px] text-r-neutral-foot w-[100px]',
                    'flex items-center justify-end gap-4 text-right'
                  )}
                >
                  {t('page.lending.list.headers.totalBorrowed')}
                  <RcIconArrowDownCC className="w-4 h-4 text-r-neutral-foot flex-shrink-0" />
                </span>
                <span className="text-[14px] leading-[18px] text-r-neutral-foot w-[80px] text-right">
                  {t('page.lending.apy')}
                </span>
                <span className="w-[80px] flex-shrink-0" />
              </div>
              {dataList.map((row) => {
                if (row.type === 'toggle_fold') {
                  return (
                    <div
                      key="toggle-fold"
                      className={clsx(
                        'w-full pt-20 pb-20 py-8 px-12 cursor-pointer text-left',
                        'text-[14px] text-r-neutral-foot'
                      )}
                      onClick={() => setFoldHideList((prev) => !prev)}
                    >
                      {foldHideList
                        ? `+ ${foldList.length} ${
                            t('page.lending.borrowList.more') || 'More'
                          }`
                        : `- ${
                            t('page.lending.borrowList.collapse') || 'Collapse'
                          }`}
                    </div>
                  );
                }
                const data = row.data;
                return (
                  <div
                    key={`${data.reserve.underlyingAsset}-${data.reserve.symbol}`}
                    className={clsx(
                      'mt-8 flex items-center justify-between px-12 py-14 rounded-[16px]',
                      'bg-rb-neutral-bg-3 hover:bg-rb-neutral-bg-4'
                    )}
                  >
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-between min-w-0 text-left"
                      onClick={() => handlePressItem(data)}
                    >
                      <div className="flex items-center gap-8 min-w-0">
                        <SymbolIcon
                          tokenSymbol={data.reserve.symbol}
                          size={24}
                        />
                        <span
                          className={clsx(
                            'text-[16px] leading-[20px] font-medium text-r-neutral-title-1',
                            'truncate max-w-[80px]'
                          )}
                        >
                          {data.reserve.symbol}
                        </span>
                      </div>
                      <span
                        className={clsx(
                          'text-[14px] leading-[18px] font-medium text-r-neutral-foot w-[100px]',
                          'flex-shrink-0 text-right'
                        )}
                      >
                        {formatListNetWorth(
                          Number(data.reserve.totalDebtUSD || '0')
                        )}
                      </span>
                      <span
                        className={clsx(
                          'text-[16px] leading-[20px] font-medium text-r-neutral-title-1 w-[80px]',
                          'flex-shrink-0 text-right'
                        )}
                      >
                        {formatApy(
                          Number(data.reserve.variableBorrowAPY || '0')
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        'ml-8 px-16 py-8 rounded-[8px] flex-shrink-0',
                        'bg-rb-neutral-bg-4 text-[14px] font-medium text-r-neutral-foot',
                        'hover:bg-rb-neutral-bg-5'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePressItem(data);
                      }}
                    >
                      {t('page.lending.borrowDetail.actions')}
                    </button>
                  </div>
                );
              })}
            </>
          )}
          {!loading && listReserves.length === 0 && (
            <div className="py-32 text-center text-r-neutral-foot">
              {t('page.lending.noData')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
