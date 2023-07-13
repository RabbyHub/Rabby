import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Input, Tooltip, message } from 'antd';
import type { ColumnType } from 'antd/lib/table';

import {
  formatAmount,
  formatUsdValue,
  openInTab,
  splitNumberByStep,
  useWallet,
} from 'ui/utils';
import './style.less';
import { useRabbyDispatch } from '@/ui/store';
import eventBus from '@/eventBus';

import { Chain } from '@debank/common';
import { NameAndAddress, TokenWithChain } from '@/ui/component';
import { findChainByServerID, makeTokenFromChain } from '@/utils/chain';

import { VirtualTable } from './components/Table';
import PillsSwitch from './components/SwitchPills';

import IconSearch from 'ui/assets/search.svg';
import IconQuestion from './icons/question.svg';
import IconFilterDefault from './icons/sort-default.svg';
import IconFilterDownActive from './icons/sort-down-active.svg';
import IconRowArrowRight from './icons/row-arrow-right.svg';
import IconExternal from 'ui/assets/icon-share.svg';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';

import {
  SwitchPills,
  useApprovalsPage,
  useTableScrollableHeight,
} from './useApprovalsPage';
import type {
  ApprovalItem,
  ContractApprovalItem,
  AssetApprovalItem,
} from '@/utils/approval';
import { ellipsisAddress } from '@/ui/utils/address';
import clsx from 'clsx';
import { formatTimeFromNow, getRiskAboutValues } from './utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';

export type RowType = ApprovalItem & {
  key?: number;
};

// Usage
const columnsForContract: ColumnType<ContractApprovalItem>[] = [
  {
    title: null,
    key: 'selection',
    render: () => null,
    width: 100,
  },
  // Contract
  {
    title: () => <span>{'Contract'}</span>,
    key: 'contract',
    dataIndex: 'key',
    render: (_, row, rowIndex) => {
      const chainItem = findChainByServerID(row.chain as Chain['serverId']);
      if (!chainItem) return null;

      return (
        <div className="flex items-center">
          <IconWithChain
            width="24px"
            height="24px"
            hideConer
            iconUrl={row?.logo_url || IconUnknown}
            chainServerId={row.chain}
            noRound={false}
          />

          <NameAndAddress
            className="ml-[6px]"
            address={row.id}
            chainEnum={chainItem.enum}
            addressSuffix={
              <span className="contract-name ml-[4px]">
                ({row.name || 'Unknown'})
              </span>
            }
            openExternal={false}
          />
        </div>
      );
    },
    width: 280,
  },
  // Risk Exposure
  {
    title: (props) => {
      const filterByThisColumn = props.sortColumns?.find(
        (item) => item.column.key === 'riskExposure'
      );
      return (
        <span className="inline-flex items-center justify-center">
          {'Risk Exposure'}
          <Tooltip overlay="Risk Exposure is the total value of assets that you have approved for this contract.">
            <img
              className="ml-[4px] w-[12px] h-[12px] relative top-[1px]"
              src={IconQuestion}
            />
          </Tooltip>
          {filterByThisColumn && (
            <img
              className="w-[12px] h-[12px] relative top-[1px]"
              src={
                filterByThisColumn.column.filtered
                  ? IconFilterDownActive
                  : IconFilterDefault
              }
            />
          )}
        </span>
      );
    },
    key: 'riskExposure',
    render(_, row) {
      if (row.type === 'contract') {
        return (
          <span>
            {formatUsdValue(row.riskAboutValues.risk_exposure_usd_value || 0)}
          </span>
        );
      }

      return null;
    },
    width: 160,
  },
  // Recent Revokes(24h)
  {
    title: () => <span>{'Recent Revokes(24h)'}</span>,
    key: 'recentRevokes',
    dataIndex: 'revoke_user_count',
    render: (_, row) => {
      if (row.type === 'contract') {
        return <span>{row.riskAboutValues.revoke_user_count}</span>;
      }

      return null;
    },
    width: 160,
  },
  // Approval Time
  {
    title: () => <span>{'Approval Time'}</span>,
    key: 'approvalTime',
    dataIndex: 'last_approve_at',
    render: (_, row) => {
      const time = row.riskAboutValues.last_approve_at;

      return formatTimeFromNow(time ? time * 1e3 : 0);
    },
    width: 160,
  },
  // My Approved Assets
  {
    title: () => <span>{'My Approved Assets'}</span>,
    key: 'myApprovedAssets',
    dataIndex: 'approve_user_count',
    render: (_, row) => {
      return (
        <div className="flex items-center justify-end w-[100%]">
          {row.list.length}
          <img className="ml-[4px]" src={IconRowArrowRight} />
        </div>
      );
    },
    width: 180,
  },
];

const columnsForAsset: ColumnType<AssetApprovalItem>[] = [
  {
    title: null,
    key: 'selection',
    render: () => null,
    width: 100,
  },
  // Asset
  {
    title: () => <span>{'Asset'}</span>,
    key: 'asset',
    dataIndex: 'key',
    render: (_, row) => {
      const chainItem = findChainByServerID(row.chain as Chain['serverId']);

      if (!chainItem?.enum) return;

      return (
        <div className="flex items-center font-bold">
          <TokenWithChain
            width="24px"
            height="24px"
            token={makeTokenFromChain(chainItem)}
          />

          <span className="ml-[8px]">{row.name || 'Unknown'}</span>
        </div>
      );
    },
    width: 180,
  },
  // Type
  {
    title: () => <span>{'Type'}</span>,
    key: 'assetType',
    dataIndex: 'type',
    render: (_, row) => {
      if (row.type === 'nft') {
        const chainItem = findChainByServerID(row.chain as Chain['serverId']);
        return (
          <span className="capitalize inline-flex items-center">
            Collection
            <img
              onClick={() => {
                if (!chainItem) return;
                openInTab(
                  chainItem?.scanLink.replace(/tx\/_s_/, `address/${row.id}`),
                  false
                );
              }}
              src={IconExternal}
              width={16}
              height={16}
              className={clsx('ml-6 cursor-pointer')}
            />
          </span>
        );
      }

      return <span className="capitalize">{row.type}</span>;
    },
    width: 140,
  },
  // Approved Amount
  {
    title: () => <span>{'Approved Amount'}</span>,
    key: 'approvedAmount',
    dataIndex: 'key',
    render: (_, row) => {
      if (row.type === 'token') {
        return `${splitNumberByStep(row.balance.toFixed(2))} ${row.name}`;
      }

      return `${row.list.length} Collection`;
    },
    width: 160,
  },
  // Approve Spender
  {
    title: () => <span>{'Approve Spender'}</span>,
    key: 'approveSpender',
    dataIndex: 'key',
    render: (_, row) => {
      const chainItem = findChainByServerID(row.chain as Chain['serverId']);
      if (!chainItem) return null;

      return (
        <div className="flex items-center">
          <IconWithChain
            width="24px"
            height="24px"
            hideConer
            iconUrl={row?.logo_url || IconUnknown}
            chainServerId={row.chain}
            noRound={row.type === 'nft'}
          />

          <NameAndAddress
            className="ml-[6px]"
            address={row.id}
            chainEnum={chainItem.enum}
            addressSuffix={
              <span className="contract-name ml-[4px]">
                ({row.name || 'Unknown'})
              </span>
            }
            openExternal={false}
          />
        </div>
      );
    },
    width: 280,
  },
  // Approve Time
  {
    title: () => <span>{'Approve Time'}</span>,
    key: 'approveTime',
    dataIndex: 'key',
    render: (_, row) => {
      const time = row.riskAboutValues.last_approve_at;

      return formatTimeFromNow(time ? time * 1e3 : 0);
    },
    width: 160,
  },
];

const ApprovalManagePage = () => {
  useEffect(() => {
    const listener = (payload: any) => {
      message.info({
        type: 'info',
        content: 'Account changed, Refreshing page...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    eventBus.addEventListener('accountsChanged', listener);

    return () => {
      eventBus.removeEventListener('accountsChanged', listener);
    };
  }, []);

  const {
    isLoading,

    searchKw,
    setSearchKw,
    account,
    displaySortedContractList,
    displaySortedAssetsList,

    filterType,
    setFilterType,

    vGridRef,
  } = useApprovalsPage();

  const dispatch = useRabbyDispatch();
  React.useEffect(() => {}, []);
  const wallet = useWallet();

  const { yValue } = useTableScrollableHeight();

  const { tableColumns, dataList } = useMemo(() => {
    switch (filterType) {
      case 'contract':
      default: {
        return {
          tableColumns: columnsForContract,
          dataList: displaySortedContractList,
        };
      }
      case 'assets': {
        return {
          tableColumns: columnsForAsset,
          dataList: displaySortedAssetsList,
        };
      }
    }
  }, [filterType, displaySortedContractList, displaySortedAssetsList]);

  return (
    <div className="approvals-manager-page">
      <div className="approvals-manager">
        <header className="approvals-manager__header">
          <div className="title">
            Approvals on{' '}
            <span className="addr-abbr">
              {ellipsisAddress(account?.address || '')}
            </span>
          </div>
        </header>

        <main>
          <div className="approvals-manager__table-tools">
            <PillsSwitch
              value={filterType}
              options={SwitchPills}
              onChange={(key) => setFilterType(key)}
            />

            <div className="search-input-wrapper">
              <Input
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                prefix={<img src={IconSearch} />}
                className="search-input"
                placeholder={`Search ${
                  filterType === 'contract' ? 'contract' : 'assets'
                } by name/address`}
              />
            </div>
          </div>

          <div className="approvals-manager__table-wrapper">
            {/* <VirtualTable<RowType>
              isLoading={isLoading}
              vGridRef={vGridRef}
              // rowSelection={{
              //   columnWidth: 100,
              //   renderCell: (value, record, index, originNode) => originNode,
              // }}
              columns={tableColumns}
              dataSource={dataList}
              scroll={{
                y: yValue,
                x: '100%',
              }}
            /> */}
            {filterType === 'contract' && (
              <VirtualTable<ContractApprovalItem>
                isLoading={isLoading}
                vGridRef={vGridRef}
                columns={columnsForContract}
                dataSource={displaySortedContractList}
                scroll={{ y: yValue, x: '100%' }}
              />
            )}
            {filterType === 'assets' && (
              <VirtualTable<AssetApprovalItem>
                isLoading={isLoading}
                vGridRef={vGridRef}
                columns={columnsForAsset}
                dataSource={displaySortedAssetsList}
                scroll={{ y: yValue, x: '100%' }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApprovalManagePage;
