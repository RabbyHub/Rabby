import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { LendingRow } from '../LendingRow';
import { MarketSelector } from '../MarketSelector';
import {
  TBody,
  THeadCell,
  THeader,
  Table,
} from '@/ui/views/CommonPopup/AssetList/components/Table';
import {
  useLendingRemoteData,
  useLendingSummary,
  useSelectedMarket,
} from '../../hooks';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import { isSameAddress } from '@/ui/utils';
import wrapperToken from '../../config/wrapperToken';
import { displayGhoForMintableMarket } from '../../utils/supply';
import BigNumber from 'bignumber.js';
import { assetCanBeBorrowedByUser } from '../../utils/borrow';
import { DisplayPoolReserveInfo } from '../../types';

type MyAssetItem = {
  type: 'borrow' | 'supply';
  usdValue: number;
  data: DisplayPoolReserveInfo;
};

export const LendingList: React.FC = () => {
  const { t } = useTranslation();
  const { reserves } = useLendingRemoteData();
  const { displayPoolReserves, iUserSummary } = useLendingSummary();
  const { chainEnum, marketKey, setMarketKey } = useSelectedMarket();

  const myAssetList: MyAssetItem[] = useMemo(() => {
    const list: MyAssetItem[] = [];
    const supplyList = displayPoolReserves?.filter((item) => {
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
      if (!reserve) {
        return false;
      }
      return (
        !(reserve?.isFrozen || reserve.isPaused) &&
        !displayGhoForMintableMarket({
          symbol: reserve.symbol,
          currentMarket: marketKey,
        })
      );
    });
    const borrowList = displayPoolReserves?.filter((item) => {
      if (isSameAddress(item.underlyingAsset, API_ETH_MOCK_ADDRESS)) {
        return false;
      }
      if (item.variableBorrows && item.variableBorrows !== '0') {
        return true;
      }
      const bgTotalDebt = new BigNumber(item.reserve.totalDebt);
      if (bgTotalDebt.gte(item.reserve.borrowCap)) {
        return false;
      }
      const reserve = reserves?.reservesData?.find((x) =>
        isSameAddress(x.underlyingAsset, item.reserve.underlyingAsset)
      );
      if (!reserve || !iUserSummary) {
        return false;
      }
      return assetCanBeBorrowedByUser(
        reserve,
        iUserSummary,
        item.reserve.eModes
      );
    });
    supplyList?.forEach((item) => {
      const supplyUsd = Number(item.underlyingBalanceUSD || '0');
      if (supplyUsd > 0) {
        list.push({
          type: 'supply',
          usdValue: supplyUsd,
          data: item,
        });
      }
    });
    borrowList.forEach((item) => {
      const borrowUsd = Number(item.totalBorrowsUSD || '0');
      if (borrowUsd > 0) {
        list.push({
          type: 'borrow',
          usdValue: borrowUsd,
          data: item,
        });
      }
    });

    return list.sort((a, b) => b.usdValue - a.usdValue);
  }, [
    chainEnum,
    displayPoolReserves,
    iUserSummary,
    marketKey,
    reserves?.reservesData,
  ]);

  const filteredData = useMemo(() => {
    return myAssetList;
  }, [myAssetList]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-[16px] py-[12px]">
        <MarketSelector value={marketKey} onChange={setMarketKey} />
        <div className="flex items-center gap-[8px]">
          <button
            className={clsx(
              'px-[16px] h-[44px] w-[160px] rounded-[12px] text-[14px] font-medium',
              'bg-rb-brand-light-1 text-rb-brand-default',
              'hover:bg-rb-brand-light-2'
            )}
          >
            {t('page.lending.actions.supply')}
          </button>
          <button
            className={clsx(
              'px-[16px] h-[44px] w-[160px] rounded-[12px] text-[14px] font-medium',
              'bg-rb-brand-default text-white',
              'hover:bg-rb-brand-default/90'
            )}
          >
            {t('page.lending.actions.borrow')}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {filteredData.length > 0 ? (
          <Table className="!w-full ml-0 mr-0">
            <THeader
              className="w-full justify-between bg-rb-neutral-bg-1 px-[20px] py-[12px] sticky top-0 z-10"
              rowClassName="px-[16px]"
            >
              <THeadCell className="flex-1 min-w-0 normal-case">
                <div className="flex items-center gap-[32px]">
                  <span className="flex-shrink-0 min-w-[140px]">
                    {t('page.lending.table.token')}
                  </span>
                  <span className="flex-shrink-0 min-w-[80px]">
                    {t('page.lending.table.type')}
                  </span>
                  <span className="flex-shrink-0 min-w-[80px]">
                    {t('page.lending.table.apy')}
                  </span>
                  <span className="flex-shrink-0 min-w-[100px]">
                    {t('page.lending.table.myAssets')}
                  </span>
                </div>
              </THeadCell>
              <THeadCell className="w-[130px] flex-shrink-0 normal-case flex justify-start">
                <div className="flex items-center justify-center">
                  {t('page.lending.table.collateral')}
                </div>
              </THeadCell>
              <THeadCell className="w-[360px] flex-shrink-0">
                <div></div>
              </THeadCell>
            </THeader>
            <TBody className="mt-0 px-20 flex flex-col gap-[12px]">
              {filteredData.map((item) => {
                return (
                  <LendingRow
                    key={`${item.data.underlyingAsset}-${item.type}`}
                    type={item.type}
                    data={item.data}
                  />
                );
              })}
            </TBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-rb-neutral-foot">
            {t('page.lending.noData')}
          </div>
        )}
      </div>
    </div>
  );
};
