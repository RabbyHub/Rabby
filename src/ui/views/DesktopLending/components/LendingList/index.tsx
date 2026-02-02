import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Modal } from 'antd';
import { LendingRow } from '../LendingRow';
import { MarketSelector } from '../MarketSelector';
import { DesktopPending } from '@/ui/views/DesktopProfile/components/DesktopPending';
import { useHistory, useLocation } from 'react-router-dom';
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
  useFetchLendingData,
  useLendingIsLoading,
} from '../../hooks';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import { isSameAddress } from '@/ui/utils';
import wrapperToken from '../../config/wrapperToken';
import { displayGhoForMintableMarket } from '../../utils/supply';
import BigNumber from 'bignumber.js';
import { assetCanBeBorrowedByUser } from '../../utils/borrow';
import { DisplayPoolReserveInfo } from '../../types';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { SupplyModal } from '../SupplyModal';
import { BorrowModal } from '../BorrowModal';
import { WithdrawModal } from '../WithdrawModal';
import { RepayModal } from '../RepayModal';
import { ToggleCollateralModal } from '../ToggleCollateralModal';
import { SupplyListModal } from '../SupplyListModal';
import { BorrowListModal } from '../BorrowListModal';
import { LendingEmptyState } from '../LendingEmptyState';

export type LendingModalType =
  | 'supply'
  | 'borrow'
  | 'repay'
  | 'withdraw'
  | 'toggleCollateral'
  | null;

const modalCommonProps = {
  width: 400,
  title: null,
  bodyStyle: { background: 'transparent', padding: 0 } as const,
  maskClosable: true,
  footer: null,
  zIndex: 1000,
  className: 'modal-support-darkmode',
  closeIcon: ModalCloseIcon,
  centered: true,
  destroyOnClose: true,
  maskStyle: {
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
};

type MyAssetItem = {
  type: 'borrow' | 'supply';
  usdValue: number;
  data: DisplayPoolReserveInfo;
};

const LendingListSkeletonItem: React.FC = () => {
  return (
    <div className="relative h-[68px] rounded-[12px] bg-rb-neutral-bg-3">
      <div className="absolute left-[20px] top-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full bg-rb-neutral-bg-4" />

      <div className="absolute left-[53px] top-[26px] h-[17px] w-[82px] rounded-[4px] bg-rb-neutral-bg-4" />
      <div className="absolute left-[198px] top-[26px] h-[17px] w-[82px] rounded-[4px] bg-rb-neutral-bg-4" />
      <div className="absolute left-[358px] top-[26px] h-[17px] w-[51px] rounded-[4px] bg-rb-neutral-bg-4" />
      <div className="absolute left-[502px] top-[26px] h-[17px] w-[92px] rounded-[4px] bg-rb-neutral-bg-4" />

      <div className="absolute right-[20px] top-1/2 -translate-y-1/2 flex items-center gap-[16px]">
        <div className="h-[36px] w-[120px] rounded-[6px] bg-rb-neutral-bg-4" />
        <div className="h-[36px] w-[120px] rounded-[6px] bg-rb-neutral-bg-4" />
      </div>
    </div>
  );
};

const LendingListSkeleton: React.FC = () => {
  return (
    <div className="mt-0 px-20 flex flex-col gap-[12px]">
      {Array.from({ length: 6 }).map((_, idx) => (
        <LendingListSkeletonItem key={idx} />
      ))}
    </div>
  );
};

export const LendingList: React.FC = () => {
  const { t } = useTranslation();
  const { reserves } = useLendingRemoteData();
  const { displayPoolReserves, iUserSummary } = useLendingSummary();
  const { chainEnum, marketKey, setMarketKey } = useSelectedMarket();
  const { fetchData } = useFetchLendingData();
  const { loading } = useLendingIsLoading();
  const history = useHistory();
  const location = useLocation();

  const [activeModal, setActiveModal] = useState<LendingModalType>(null);
  const [
    selectedItem,
    setSelectedItem,
  ] = useState<DisplayPoolReserveInfo | null>(null);
  const [listModalType, setListModalType] = useState<
    'supplyList' | 'borrowList' | null
  >(null);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setSelectedItem(null);
    setListModalType(null);
  }, []);

  const handleSupplyListSelect = useCallback(
    (reserve: DisplayPoolReserveInfo) => {
      setSelectedItem(reserve);
      setListModalType(null);
      setActiveModal('supply');
    },
    []
  );

  const handleBorrowListSelect = useCallback(
    (reserve: DisplayPoolReserveInfo) => {
      setSelectedItem(reserve);
      setListModalType(null);
      setActiveModal('borrow');
    },
    []
  );

  const onAction = useCallback(
    (action: LendingModalType, data: DisplayPoolReserveInfo) => {
      setSelectedItem(data);
      setActiveModal(action);
    },
    [setSelectedItem, setActiveModal]
  );

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

  const handleMarketChange = useCallback(
    (value: typeof marketKey) => {
      setMarketKey(value);
      const searchParams = new URLSearchParams(location.search);
      if (value) {
        searchParams.set('marketKey', value);
      } else {
        searchParams.delete('marketKey');
      }
      history.replace({
        pathname: location.pathname,
        search: searchParams.toString(),
      });
    },
    [history, location.pathname, location.search, setMarketKey]
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-[16px] py-[12px]">
        <MarketSelector value={marketKey} onChange={handleMarketChange} />
        <div className="flex items-center gap-[8px]">
          <DesktopPending className="min-w-[160px] h-[44px] rounded-[12px] text-[15px]" />
          <button
            type="button"
            className={clsx(
              'px-[16px] h-[44px] w-[160px] rounded-[12px] text-[14px] font-medium',
              'bg-rb-brand-light-1 text-rb-brand-default',
              'hover:bg-rb-brand-light-2'
            )}
            onClick={() => setListModalType('supplyList')}
          >
            {t('page.lending.actions.supply')}
          </button>
          <button
            type="button"
            className={clsx(
              'px-[16px] h-[44px] w-[160px] rounded-[12px] text-[14px] font-medium',
              'bg-rb-brand-default text-white',
              'hover:bg-rb-brand-default/90'
            )}
            onClick={() => setListModalType('borrowList')}
          >
            {t('page.lending.actions.borrow')}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <LendingListSkeleton />
        ) : filteredData.length > 0 ? (
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
                    onSupply={() => onAction('supply', item.data)}
                    onBorrow={() => onAction('borrow', item.data)}
                    onRepay={() => onAction('repay', item.data)}
                    onWithdraw={() => onAction('withdraw', item.data)}
                    onToggleCollateral={() =>
                      onAction('toggleCollateral', item.data)
                    }
                  />
                );
              })}
            </TBody>
          </Table>
        ) : (
          <LendingEmptyState onSelect={handleSupplyListSelect} />
        )}
      </div>

      <Modal
        {...modalCommonProps}
        width={1040}
        bodyStyle={{
          ...modalCommonProps.bodyStyle,
          minHeight: 770,
        }}
        visible={listModalType === 'supplyList'}
        onCancel={closeModal}
      >
        <SupplyListModal
          onSelect={handleSupplyListSelect}
          onCancel={closeModal}
        />
      </Modal>
      <Modal
        {...modalCommonProps}
        width={1040}
        bodyStyle={{
          ...modalCommonProps.bodyStyle,
          minHeight: 770,
        }}
        visible={listModalType === 'borrowList'}
        onCancel={closeModal}
      >
        <BorrowListModal
          onSelect={handleBorrowListSelect}
          onCancel={closeModal}
        />
      </Modal>
      <Modal
        {...modalCommonProps}
        visible={activeModal === 'supply'}
        onCancel={closeModal}
      >
        {selectedItem && (
          <SupplyModal
            visible={activeModal === 'supply'}
            onCancel={closeModal}
            reserve={selectedItem}
            userSummary={iUserSummary}
            onSuccess={() => fetchData()}
          />
        )}
      </Modal>
      <Modal
        {...modalCommonProps}
        visible={activeModal === 'borrow'}
        onCancel={closeModal}
      >
        {selectedItem && (
          <BorrowModal
            visible={activeModal === 'borrow'}
            onCancel={closeModal}
            reserve={selectedItem}
            userSummary={iUserSummary}
            onSuccess={() => fetchData()}
          />
        )}
      </Modal>
      <Modal
        {...modalCommonProps}
        visible={activeModal === 'repay'}
        onCancel={closeModal}
      >
        {selectedItem && (
          <RepayModal
            visible={activeModal === 'repay'}
            onCancel={closeModal}
            reserve={selectedItem}
            userSummary={iUserSummary}
            onSuccess={() => fetchData()}
          />
        )}
      </Modal>
      <Modal
        {...modalCommonProps}
        visible={activeModal === 'withdraw'}
        onCancel={closeModal}
      >
        {selectedItem && (
          <WithdrawModal
            visible={activeModal === 'withdraw'}
            onCancel={closeModal}
            reserve={selectedItem}
            userSummary={iUserSummary}
            onSuccess={() => fetchData()}
          />
        )}
      </Modal>
      <Modal
        {...modalCommonProps}
        visible={activeModal === 'toggleCollateral'}
        onCancel={closeModal}
      >
        {selectedItem && (
          <ToggleCollateralModal
            visible={activeModal === 'toggleCollateral'}
            onCancel={closeModal}
            reserve={selectedItem}
            userSummary={iUserSummary}
            onSuccess={() => fetchData()}
          />
        )}
      </Modal>
    </div>
  );
};
