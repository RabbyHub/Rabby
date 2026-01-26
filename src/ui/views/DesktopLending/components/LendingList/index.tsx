import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { LendingRow, LendingRowData } from '../LendingRow';
import { MarketSelector } from '../MarketSelector';
import {
  TBody,
  THeadCell,
  THeader,
  Table,
} from '@/ui/views/CommonPopup/AssetList/components/Table';

export const LendingList: React.FC = () => {
  const { t } = useTranslation();
  const [selectedMarket, setSelectedMarket] = useState<string>('core');

  const mockData: LendingRowData[] = useMemo(() => {
    return [
      {
        id: '1',
        asset: 'WBTC',
        type: 'supplied',
        apy: 0.0041,
        myAssets: 622.43,
        isCollateral: true,
        isIsolated: false,
        onCollateralChange: (checked) =>
          console.log('Collateral changed:', checked),
        onSupply: () => console.log('Supply'),
        onWithdraw: () => console.log('Withdraw'),
      },
      {
        id: '2',
        asset: 'ETH',
        type: 'borrowed',
        apy: 0.0042,
        myAssets: 522.43,
        isIsolated: false,
        onSwap: () => console.log('Swap'),
        onBorrow: () => console.log('Borrow'),
        onRepay: () => console.log('Repay'),
      },
      {
        id: '3',
        asset: 'USDC',
        type: 'supplied',
        apy: 0.0442,
        myAssets: 422.43,
        isCollateral: true,
        isIsolated: false,
        onCollateralChange: (checked) =>
          console.log('Collateral changed:', checked),
        onSupply: () => console.log('Supply'),
        onWithdraw: () => console.log('Withdraw'),
      },
      {
        id: '4',
        asset: 'USDT',
        type: 'supplied',
        apy: 0.0243,
        myAssets: 322.43,
        isCollateral: true,
        isIsolated: true,
        onCollateralChange: (checked) =>
          console.log('Collateral changed:', checked),
        onSupply: () => console.log('Supply'),
        onWithdraw: () => console.log('Withdraw'),
      },
      {
        id: '5',
        asset: 'USDT',
        type: 'borrowed',
        apy: 0.0342,
        myAssets: 122.43,
        isIsolated: false,
        onSwap: () => console.log('Swap'),
        onBorrow: () => console.log('Borrow'),
        onRepay: () => console.log('Repay'),
      },
    ];
  }, []);

  const filteredData = useMemo(() => {
    return mockData;
  }, [mockData]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-[16px] py-[12px]">
        <MarketSelector value={selectedMarket} onChange={setSelectedMarket} />
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
                  <span className="flex-shrink-0 min-w-[120px]">
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
                return <LendingRow key={item.id} data={item} />;
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
