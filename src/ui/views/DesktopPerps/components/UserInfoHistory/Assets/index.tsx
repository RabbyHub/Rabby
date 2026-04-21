import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnType } from 'antd/lib/table';
import BigNumber from 'bignumber.js';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import { useRabbySelector } from '@/ui/store';
import {
  ALL_PERPS_QUOTE_ASSETS,
  PerpsQuoteAsset,
  PERPS_LOW_BALANCE_THRESHOLD,
  getSpotBalanceKey,
} from '@/ui/views/Perps/constants';
import { usePerpsPopupNav } from '@/ui/views/DesktopPerps/hooks/usePerpsPopupNav';
import { CommonTable } from '../CommonTable';

interface AssetRow {
  coin: PerpsQuoteAsset;
  total: number;
  available: number;
  action: 'swap' | 'enable';
}

export const Assets: React.FC = () => {
  const { t } = useTranslation();
  const { isUnifiedAccount, spotBalancesMap } = usePerpsAccount();
  const clearinghouseState = useRabbySelector(
    (s) => s.perps.clearinghouseState
  );
  const { openPerpsPopup } = usePerpsPopupNav();

  const rows = useMemo<AssetRow[]>(() => {
    if (!isUnifiedAccount) {
      const withdrawable = Number(clearinghouseState?.withdrawable || 0);
      const equity =
        Number(clearinghouseState?.marginSummary?.accountValue || 0) ||
        withdrawable;
      return [
        {
          coin: 'USDC',
          total: equity,
          available: withdrawable,
          action: 'enable',
        },
      ];
    }
    return ALL_PERPS_QUOTE_ASSETS.map((coin) => {
      const b = spotBalancesMap[getSpotBalanceKey(coin)];
      return {
        coin,
        total: Number(b?.total || 0),
        available: Number(b?.available || 0),
        action: 'swap' as const,
      };
    });
  }, [isUnifiedAccount, spotBalancesMap, clearinghouseState]);

  const onActionClick = (coin: PerpsQuoteAsset, action: 'swap' | 'enable') => {
    if (action === 'enable') {
      openPerpsPopup('enable-unified');
    } else {
      // Clicking a row means "sell FROM this coin" (pair with USDC as the destination).
      openPerpsPopup('swap', { source: coin });
    }
  };

  const columns = useMemo<ColumnType<AssetRow>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.assets.columnAsset'),
        dataIndex: 'coin',
        key: 'coin',
        sorter: (a, b) => a.coin.localeCompare(b.coin),
        render: (_, record) => (
          <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
            {record.coin}
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.assets.columnTotal'),
        dataIndex: 'total',
        key: 'total',
        sorter: (a, b) => a.total - b.total,
        render: (_, record) => (
          <div className="text-[13px] leading-[16px] text-r-neutral-title-1">
            {new BigNumber(record.total).toFixed(4)} {record.coin}
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.assets.columnAvailable'),
        dataIndex: 'available',
        key: 'available',
        sorter: (a, b) => a.available - b.available,
        render: (_, record) => {
          const isLow = new BigNumber(record.available).lt(
            PERPS_LOW_BALANCE_THRESHOLD
          );
          return (
            <div
              className={
                isLow
                  ? 'text-[13px] leading-[16px] text-r-neutral-foot'
                  : 'text-[13px] leading-[16px] text-r-neutral-title-1'
              }
            >
              {new BigNumber(record.available).toFixed(4)} {record.coin}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.assets.columnAction'),
        dataIndex: 'action',
        key: 'action',
        render: (_, record) => (
          <a
            className="text-[13px] leading-[16px] text-r-blue-default cursor-pointer font-medium"
            onClick={() => onActionClick(record.coin, record.action)}
          >
            {record.action === 'swap'
              ? t('page.perpsPro.userInfo.assets.swapStablecoins')
              : t('page.perpsPro.userInfo.assets.enableUnifiedAccount')}
          </a>
        ),
      },
    ],
    [t]
  );

  return (
    <CommonTable
      emptyMessage={t('page.perpsPro.userInfo.emptyMessage.assets')}
      dataSource={rows}
      columns={columns}
      pagination={false}
      rowKey={(record) => record.coin}
      bordered={false}
      showSorterTooltip={false}
      defaultSortField="total"
      defaultSortOrder="descend"
      rowHeight={32}
    />
  );
};

export default Assets;
