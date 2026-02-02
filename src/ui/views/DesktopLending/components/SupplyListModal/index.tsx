import React, { useCallback, useMemo, useState } from 'react';
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
import wrapperToken from '../../config/wrapperToken';
import { displayGhoForMintableMarket } from '../../utils/supply';
import { isUnFoldToken } from '../../config/unfold';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { SupplyItem } from './SupplyItem';

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

  const [foldHideList, setFoldHideList] = useState(true);

  const isInIsolationMode = useMemo(() => !!iUserSummary?.isInIsolationMode, [
    iUserSummary?.isInIsolationMode,
  ]);

  const sortReserves = useMemo(() => {
    return (displayPoolReserves ?? [])
      .filter((item) => {
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
      })
      .sort((a, b) => {
        return (
          Number(b.reserve.totalLiquidityUSD) -
          Number(a.reserve.totalLiquidityUSD)
        );
      });
  }, [chainEnum, displayPoolReserves, marketKey, reserves?.reservesData]);

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
    <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px] pb-8 w-full h-full min-h-0 flex flex-col">
      <h2 className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1 mb-12 px-12">
        {t('page.lending.supplyDetail.actions')}
      </h2>
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-32 text-r-neutral-foot">
          Loading...
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          {isolatedCard}
          {listReserves.length > 0 && (
            <>
              <div className="mt-16 mb-2 flex items-center justify-between px-8">
                <span className="text-[14px] leading-[18px] text-r-neutral-foot flex-1">
                  {t('page.lending.list.headers.token')}
                </span>
                <span className="text-[14px] leading-[18px] text-r-neutral-foot w-[80px] text-right">
                  {t('page.lending.tvl')}
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
                      className="w-full pt-20 pb-20 py-8 px-12 text-[14px] text-r-neutral-foot text-left cursor-pointer"
                      onClick={() => setFoldHideList((prev) => !prev)}
                    >
                      {foldHideList
                        ? `+ ${foldList.length} ${
                            t('page.lending.supplyList.more') || 'More'
                          }`
                        : `- ${
                            t('page.lending.supplyList.collapse') || 'Collapse'
                          }`}
                    </div>
                  );
                }
                const data = row.data;
                return <SupplyItem data={data} onSelect={handlePressItem} />;
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
