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

type RowAction = 'swap' | 'enable-unified' | 'transfer-to-perps' | 'none';

interface AssetRow {
  key: string;
  /** Symbol used for column "Assets". For non-unified shows "USDC(Spot)" / "USDC(Perps)". */
  label: string;
  /** Underlying coin used for unit suffix and any coin-keyed action. */
  coin: PerpsQuoteAsset;
  total: number;
  available: number;
  action: RowAction;
}

export const Assets: React.FC = () => {
  const { t } = useTranslation();
  const { isUnifiedAccount, spotBalancesMap } = usePerpsAccount();
  const clearinghouseState = useRabbySelector(
    (s) => s.perps.clearinghouseState
  );
  // Spot balances for the not-unified case — `usePerpsAccount` zeroes them in
  // that mode for margin-usage purposes, but here we explicitly want the spot
  // wallet view, so read raw store state.
  const rawSpotBalancesMap = useRabbySelector(
    (s) => s.perps.spotState.balancesMap
  );
  const { openPerpsPopup } = usePerpsPopupNav();

  const rows = useMemo<AssetRow[]>(() => {
    if (!isUnifiedAccount) {
      const spotUsdc = rawSpotBalancesMap[getSpotBalanceKey('USDC')];
      const spotTotal = Number(spotUsdc?.total || 0);
      const spotAvailable = Number(spotUsdc?.available || 0);

      const perpsWithdrawable = Number(clearinghouseState?.withdrawable || 0);
      const perpsTotal =
        Number(clearinghouseState?.marginSummary?.accountValue || 0) ||
        perpsWithdrawable;

      return [
        {
          key: 'usdc-spot',
          label: t('page.perpsPro.userInfo.assets.usdcSpot'),
          coin: 'USDC',
          total: spotTotal,
          available: spotAvailable,
          action: 'transfer-to-perps',
        },
        {
          key: 'usdc-perps',
          label: t('page.perpsPro.userInfo.assets.usdcPerps'),
          coin: 'USDC',
          total: perpsTotal,
          available: perpsWithdrawable,
          action: 'none',
        },
      ];
    }
    return ALL_PERPS_QUOTE_ASSETS.map((coin) => {
      const b = spotBalancesMap[getSpotBalanceKey(coin)];
      return {
        key: coin,
        label: coin,
        coin,
        total: Number(b?.total || 0),
        available: Number(b?.available || 0),
        action: 'swap' as const,
      };
    }).filter((row) => row.available >= PERPS_LOW_BALANCE_THRESHOLD);
  }, [
    isUnifiedAccount,
    spotBalancesMap,
    rawSpotBalancesMap,
    clearinghouseState,
    t,
  ]);

  const onActionClick = (row: AssetRow) => {
    if (row.action === 'enable-unified') {
      openPerpsPopup('enable-unified');
    } else if (row.action === 'swap') {
      // Clicking a row means "sell FROM this coin" (pair with USDC as the destination).
      openPerpsPopup('swap', { source: row.coin });
    } else if (row.action === 'transfer-to-perps') {
      openPerpsPopup('transfer-to-perps');
    }
  };

  const columns = useMemo<ColumnType<AssetRow>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.assets.columnAsset'),
        dataIndex: 'label',
        key: 'label',
        width: 100,
        sorter: (a, b) => a.label.localeCompare(b.label),
        render: (_, record) => (
          <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
            {record.label}
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.assets.columnTotal'),
        dataIndex: 'total',
        key: 'total',
        width: 200,
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
        width: 200,
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
        render: (_, record) => {
          if (record.action === 'none') return null;
          const label =
            record.action === 'swap'
              ? t('page.perpsPro.userInfo.assets.swapStablecoins')
              : record.action === 'enable-unified'
              ? t('page.perpsPro.userInfo.assets.enableUnifiedAccount')
              : t('page.perpsPro.userInfo.assets.transferToPerps');
          return (
            <a
              className="text-[13px] leading-[16px] text-r-blue-default cursor-pointer font-medium"
              onClick={() => onActionClick(record)}
            >
              {label}
            </a>
          );
        },
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
      rowKey={(record) => record.key}
      bordered={false}
      showSorterTooltip={false}
      defaultSortField="total"
      defaultSortOrder="descend"
      rowHeight={32}
      tableLayout="fixed"
    />
  );
};

export default Assets;
