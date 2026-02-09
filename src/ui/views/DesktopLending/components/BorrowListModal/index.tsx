import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { isSameAddress } from '@/ui/utils';
import {
  useLendingRemoteData,
  useLendingSummary,
  useLendingIsLoading,
} from '../../hooks';
import { DisplayPoolReserveInfo } from '../../types';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import { assetCanBeBorrowedByUser } from '../../utils/borrow';
import { formatListNetWorth } from '../../utils/format';
import { isUnFoldToken } from '../../config/unfold';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { ReactComponent as RcIconArrowCC } from '@/ui/assets/lending/arrow-cc.svg';
import { BorrowItem } from './BorrowItem';
import { useSelectedMarket } from '../../hooks/market';
import { getMaxModalHeight } from '../LendingList/window';

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

  type SortField = 'debt' | 'apy';
  type SortDirection = 'asc' | 'desc';

  const [foldHideList, setFoldHideList] = useState(true);
  const [sortField, setSortField] = useState<SortField>('debt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const isInIsolationMode = useMemo(() => !!iUserSummary?.isInIsolationMode, [
    iUserSummary?.isInIsolationMode,
  ]);

  const sortReserves = useMemo(() => {
    const list =
      displayPoolReserves?.filter((item) => {
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
      }) ?? [];

    const getSortValue = (item: DisplayPoolReserveInfo) => {
      if (sortField === 'debt') {
        return Number(item.reserve.totalDebtUSD || '0');
      }
      // apy
      return Number(item.reserve.variableBorrowAPY || '0');
    };

    return [...list].sort((a, b) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);
      if (sortDirection === 'desc') {
        return bv - av;
      }
      return av - bv;
    });
  }, [
    displayPoolReserves,
    iUserSummary,
    reserves?.reservesData,
    sortField,
    sortDirection,
  ]);

  const listReserves = useMemo(() => sortReserves ?? [], [sortReserves]);

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
          showOrange ? 'bg-rb-orange-light-1' : 'bg-rb-neutral-bg-1'
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
        <div
          className={`text-[13px] leading-[18px] mt-2 ${
            showOrange ? 'text-rb-orange-default' : 'text-r-neutral-foot'
          }`}
        >
          {desc}
        </div>
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

  const handleSortClick = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prevDir) => (prevDir === 'desc' ? 'asc' : 'desc'));
        return prevField;
      }
      setSortDirection('desc');
      return field;
    });
  }, []);

  return (
    <div
      className={clsx('w-full h-full min-h-0 flex flex-col', 'p-[24px] pb-8')}
      style={{
        maxHeight: getMaxModalHeight(),
      }}
    >
      <h2
        className={clsx(
          'text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1 mb-12',
          'flex-shrink-0 h-[24px]'
        )}
      >
        {t('page.lending.borrowDetail.actions')}
      </h2>
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-32 text-r-neutral-foot">
          Loading...
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0 overflow-y-auto">
          {availableCard}
          {listReserves.length > 0 && (
            <>
              <div className="mt-16 mb-2 flex items-center justify-start px-16">
                <span className="text-[14px] leading-[18px] text-r-neutral-foot w-[150px]">
                  {t('page.lending.list.headers.token')}
                </span>
                <div
                  className={clsx(
                    'text-[14px] leading-[18px] w-[150px] text-right cursor-pointer flex items-center justify-end gap-3',
                    sortField === 'debt'
                      ? 'text-r-neutral-title-1 font-medium'
                      : 'text-r-neutral-foot'
                  )}
                  onClick={() => handleSortClick('debt')}
                >
                  <span>{t('page.lending.list.headers.totalBorrowed')}</span>
                  <RcIconArrowCC
                    width={12}
                    height={12}
                    className={clsx(
                      'ml-[3px] flex-shrink-0 inline-block',
                      sortDirection === 'asc' && sortField === 'debt'
                        ? '-rotate-90'
                        : 'rotate-90'
                    )}
                  />
                </div>
                <div
                  className={clsx(
                    'text-[14px] leading-[18px] w-[150px] text-right cursor-pointer flex items-center justify-end gap-3',
                    sortField === 'apy'
                      ? 'text-r-neutral-title-1 font-medium'
                      : 'text-r-neutral-foot'
                  )}
                  onClick={() => handleSortClick('apy')}
                >
                  <span>{t('page.lending.apy')}</span>
                  <RcIconArrowCC
                    width={12}
                    height={12}
                    className={clsx(
                      'ml-[3px] flex-shrink-0 inline-block',
                      sortDirection === 'asc' && sortField === 'apy'
                        ? '-rotate-90'
                        : 'rotate-90'
                    )}
                  />
                </div>
                <span className="w-[80px] flex-shrink-0" />
              </div>
              {dataList.map((row) => {
                if (row.type === 'toggle_fold') {
                  return (
                    <div
                      key="toggle-fold"
                      className={clsx(
                        'w-full pt-20 pb-12 text-left',
                        'flex items-center '
                      )}
                    >
                      <div
                        className={clsx(
                          'pl-[26.5px] pr-[16.5px] py-8 rounded-full bg-r-neutral-card-1',
                          'flex items-center justify-center gap-4',
                          'cursor-pointer text-[12px] text-r-neutral-foot'
                        )}
                        onClick={() => setFoldHideList((prev) => !prev)}
                      >
                        <span>{t('page.lending.borrowList.more')}</span>
                        <RcIconArrowCC
                          width={12}
                          height={12}
                          className={clsx(
                            'text-r-neutral-foot flex-shrink-0 inline-block transition-transform',
                            !foldHideList ? '-rotate-90' : 'rotate-90'
                          )}
                        />
                      </div>
                    </div>
                  );
                }
                const data = row.data;
                return (
                  <BorrowItem
                    key={`${data.reserve.underlyingAsset}-${data.reserve.symbol}`}
                    data={data}
                    handlePressItem={handlePressItem}
                  />
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
