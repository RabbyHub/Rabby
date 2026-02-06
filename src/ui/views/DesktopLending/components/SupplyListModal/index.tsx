import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { isSameAddress } from '@/ui/utils';
import {
  useLendingRemoteData,
  useLendingSummary,
  useLendingIsLoading,
} from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import { DisplayPoolReserveInfo } from '../../types';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import wrapperToken from '../../config/wrapperToken';
import { displayGhoForMintableMarket } from '../../utils/supply';
import { isUnFoldToken } from '../../config/unfold';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { SupplyItem } from './SupplyItem';
import { ReactComponent as RcIconArrowCC } from '@/ui/assets/lending/arrow-cc.svg';

type SupplyListModalProps = {
  onSelect: (reserve: DisplayPoolReserveInfo) => void;
  onCancel: () => void;
};

type SupplyListItem =
  | { type: 'reserve'; data: DisplayPoolReserveInfo }
  | { type: 'toggle_fold' };

export const SupplyListModal: React.FC<SupplyListModalProps> = ({
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
  const { chainEnum, marketKey } = useSelectedMarket();

  type SortField = 'tvl' | 'apy' | 'balance';
  type SortDirection = 'asc' | 'desc';

  const [foldHideList, setFoldHideList] = useState(true);
  const [sortField, setSortField] = useState<SortField>('tvl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const isInIsolationMode = useMemo(() => !!iUserSummary?.isInIsolationMode, [
    iUserSummary?.isInIsolationMode,
  ]);

  const sortReserves = useMemo(() => {
    const list =
      displayPoolReserves?.filter((item) => {
        if (item.underlyingBalance && item.underlyingBalance !== '0') {
          return true;
        }
        const realUnderlyingAsset =
          isSameAddress(item.underlyingAsset, API_ETH_MOCK_ADDRESS) && chainEnum
            ? wrapperToken?.[chainEnum]?.address
            : item.reserve.underlyingAsset;
        const reserve = reserves?.reservesData?.find((x) =>
          isSameAddress(x.underlyingAsset, realUnderlyingAsset)
        );
        if (!reserve) return false;
        return (
          !(reserve?.isFrozen || reserve.isPaused) &&
          !displayGhoForMintableMarket({
            symbol: reserve.symbol,
            currentMarket: marketKey,
          })
        );
      }) ?? [];

    const getSortValue = (item: DisplayPoolReserveInfo) => {
      if (sortField === 'tvl') {
        return Number(item.reserve.totalLiquidityUSD || '0');
      }
      if (sortField === 'apy') {
        return Number(item.reserve.supplyAPY || '0');
      }
      // balance
      return Number(item.walletBalanceUSD || '0');
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
    chainEnum,
    displayPoolReserves,
    marketKey,
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

  const dataList = useMemo<SupplyListItem[]>(() => {
    if (loading) return [];
    const list: SupplyListItem[] = [];
    unFoldList.forEach((item) => list.push({ type: 'reserve', data: item }));
    if (foldList.length) {
      list.push({ type: 'toggle_fold' });
      if (!foldHideList) {
        foldList.forEach((item) => list.push({ type: 'reserve', data: item }));
      }
    }
    return list;
  }, [foldHideList, foldList, loading, unFoldList]);

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

  const isolatedCard = useMemo(() => {
    if (loading || !isInIsolationMode) return null;
    return (
      <div className="mt-8 px-16 py-12 rounded-[6px] bg-rb-orange-light-1 flex items-center gap-4">
        <RcIconWarningCC
          viewBox="0 0 16 16"
          className="w-14 h-14 text-rb-orange-default flex-shrink-0"
        />
        <span className="text-[14px] leading-[18px] text-rb-orange-default">
          {t('page.lending.modalDesc.isolatedSupplyDesc')}
        </span>
      </div>
    );
  }, [isInIsolationMode, loading, t]);

  return (
    <div
      className={clsx(
        'w-full h-full min-h-0 flex flex-col max-h-[770px]',
        'p-[24px] pb-8'
      )}
    >
      <h2
        className={clsx(
          'text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1 mb-12',
          'flex-shrink-0 h-[24px]'
        )}
      >
        {t('page.lending.supplyDetail.actions')}
      </h2>
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-32 text-r-neutral-foot">
          Loading...
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0 overflow-y-auto">
          {isolatedCard}
          {listReserves.length > 0 && (
            <>
              <div className="mt-16 mb-2 flex items-center justify-start px-16">
                <span className="text-[14px] leading-[18px] text-r-neutral-foot w-[150px]">
                  {t('page.lending.list.headers.token')}
                </span>
                <span
                  className={clsx(
                    'text-[14px] leading-[18px] w-[150px] text-right cursor-pointer flex items-center justify-end gap-1',
                    sortField === 'tvl'
                      ? 'text-r-neutral-title-1 font-medium'
                      : 'text-r-neutral-foot'
                  )}
                  onClick={() => handleSortClick('tvl')}
                >
                  {t('page.lending.tvl')}

                  <RcIconArrowCC
                    width={12}
                    height={12}
                    className={clsx(
                      'w-3 h-3 flex-shrink-0 inline-block',
                      sortDirection === 'asc' && sortField === 'tvl'
                        ? '-rotate-90'
                        : 'rotate-90'
                    )}
                  />
                </span>
                <span
                  className={clsx(
                    'text-[14px] leading-[18px] w-[150px] text-right cursor-pointer flex items-center justify-end gap-1',
                    sortField === 'apy'
                      ? 'text-r-neutral-title-1 font-medium'
                      : 'text-r-neutral-foot'
                  )}
                  onClick={() => handleSortClick('apy')}
                >
                  {t('page.lending.apy')}

                  <RcIconArrowCC
                    width={12}
                    height={12}
                    className={clsx(
                      'w-3 h-3 flex-shrink-0 inline-block',
                      sortDirection === 'asc' && sortField === 'apy'
                        ? '-rotate-90'
                        : 'rotate-90'
                    )}
                  />
                </span>
                <span
                  className={clsx(
                    'text-[14px] leading-[18px] w-[150px] text-right cursor-pointer flex items-center justify-end gap-1',
                    sortField === 'balance'
                      ? 'text-r-neutral-title-1 font-medium'
                      : 'text-r-neutral-foot'
                  )}
                  onClick={() => handleSortClick('balance')}
                >
                  {t('page.lending.list.headers.my_balance')}

                  <RcIconArrowCC
                    width={12}
                    height={12}
                    className={clsx(
                      'w-3 h-3 flex-shrink-0 inline-block',
                      sortDirection === 'asc' && sortField === 'balance'
                        ? '-rotate-90'
                        : 'rotate-90'
                    )}
                  />
                </span>
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
                          'flex items-center justify-center gap-2',
                          'cursor-pointer text-[12px] text-r-neutral-foot'
                        )}
                        onClick={() => setFoldHideList((prev) => !prev)}
                      >
                        <span>{t('page.lending.supplyList.more')}</span>
                        <RcIconArrowCC
                          width={12}
                          height={12}
                          className={clsx(
                            'text-r-neutral-foot flex-shrink-0 inline-block transition-transform',
                            !foldHideList && '-rotate-90'
                          )}
                        />
                      </div>
                    </div>
                  );
                }
                const data = row.data;
                return (
                  <SupplyItem
                    key={`${data.reserve.underlyingAsset}-${data.reserve.symbol}`}
                    data={data}
                    onSelect={handlePressItem}
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
