import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Tooltip, message } from 'antd';
import type { ColumnType, TableProps } from 'antd/lib/table';
import { InfoCircleOutlined } from '@ant-design/icons';

import {
  formatUsdValue,
  openInTab,
  splitNumberByStep,
  useWallet,
} from 'ui/utils';
import './style.less';
import eventBus from '@/eventBus';

import { Chain } from '@debank/common';
import NameAndAddress from '@/ui/component/NameAndAddress';
import { findChainByServerID, makeTokenFromChain } from '@/utils/chain';

import { VirtualTable } from './components/Table';
import { VariableSizeGrid as VGrid } from 'react-window';
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
import {
  ApprovalItem,
  ContractApprovalItem,
  AssetApprovalSpender,
  getSpenderApprovalAmount,
} from '@/utils/approval';
import { ellipsisAddress } from '@/ui/utils/address';
import clsx from 'clsx';
import { formatTimeFromNow, isRiskyContract } from './utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { SorterResult } from 'antd/lib/table/interface';
import { RevokeApprovalModal } from './components/RevokeApprovalModal';
import { RISKY_ROW_HEIGHT, ROW_HEIGHT } from './constant';
import { RevokeButton } from './components/RevokeButton';

interface RevokeItem {
  id: string;
  list: any[];
}

const DEFAULT_SORT_ORDER = 'descend';
function getNextSort(currentSort?: 'ascend' | 'descend' | null) {
  return currentSort === 'ascend' ? 'descend' : ('ascend' as const);
}
const DEFAULT_SORT_ORDER_TUPLE = ['descend', 'ascend'] as const;

function getColumnsForContract({
  sortedInfo,
}: {
  sortedInfo: SorterResult<ContractApprovalItem>;
}) {
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

        const risky = isRiskyContract(row);

        return (
          <div className="flex flex-col justify-between">
            <div className="contract-basic-info flex items-center">
              <IconWithChain
                width="24px"
                height="24px"
                hideConer
                iconUrl={row?.logo_url || IconUnknown}
                chainServerId={row.chain}
                noRound={false}
              />

              <NameAndAddress.SafeCopy
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

            {risky && (
              <div className="mt-[14px]">
                <Alert
                  className={clsx(
                    'rounded-[4px] px-[8px] py-[3px]',
                    row.risk_level === 'danger' ? 'bg-[#ec5151]' : 'bg-orange',
                    `J_risky_${row.risk_level}`,
                    'alert-with-caret'
                  )}
                  icon={
                    <InfoCircleOutlined className="text-white pt-[4px] self-start" />
                  }
                  banner
                  message={
                    <span className="text-12 text-white">{row.risk_alert}</span>
                  }
                  type={'error'}
                />
              </div>
            )}
          </div>
        );
      },
      width: 280,
    },
    // Risk Exposure
    {
      title: (props) => {
        return (
          <span className="inline-flex items-center justify-center">
            {'Risk Exposure'}
            <Tooltip overlay="The total asset value approved and exposed to this contract">
              <img
                className="ml-[4px] w-[12px] h-[12px] relative top-[1px]"
                src={IconQuestion}
              />
            </Tooltip>
          </span>
        );
      },
      key: 'riskExposure',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      sorter: (a, b) =>
        a.$riskAboutValues.risk_exposure_usd_value -
        b.$riskAboutValues.risk_exposure_usd_value,
      sortOrder:
        sortedInfo.columnKey === 'riskExposure' ? sortedInfo.order : null,
      render(_, row) {
        if (row.type === 'contract') {
          return (
            <span>
              {formatUsdValue(
                row.$riskAboutValues.risk_exposure_usd_value || 0
              )}
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
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      sorter: (a, b) =>
        a.$riskAboutValues.revoke_user_count -
        b.$riskAboutValues.revoke_user_count,
      sortOrder:
        sortedInfo.columnKey === 'recentRevokes' ? sortedInfo.order : null,
      render: (_, row) => {
        if (row.type === 'contract') {
          return <span>{row.$riskAboutValues.revoke_user_count}</span>;
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
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      sorter: (a, b) =>
        a.$riskAboutValues.last_approve_at - b.$riskAboutValues.last_approve_at,
      sortOrder:
        sortedInfo.columnKey === 'approvalTime' ? sortedInfo.order : null,
      render: (_, row) => {
        const time = row.$riskAboutValues.last_approve_at;

        return formatTimeFromNow(time ? time * 1e3 : 0);
      },
      width: 160,
    },
    // My Approved Assets
    {
      title: () => <span>{'My Approved Assets'}</span>,
      key: 'myApprovedAssets',
      dataIndex: 'approve_user_count',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      sorter: (a, b) => a.list.length - b.list.length,
      sortOrder:
        sortedInfo.columnKey === 'myApprovedAssets' ? sortedInfo.order : null,
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

  return columnsForContract;
}

function getColumnsForAsset({
  sortedInfo,
}: {
  sortedInfo: SorterResult<AssetApprovalSpender>;
}) {
  const columnsForAsset: ColumnType<AssetApprovalSpender>[] = [
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
        const asset = row.$assetParent;
        if (!asset) return null;

        const chainItem = findChainByServerID(asset.chain as Chain['serverId']);

        if (!chainItem?.enum) return;

        return (
          <div className="flex items-center font-bold">
            <IconWithChain
              width="24px"
              height="24px"
              hideConer
              iconUrl={asset?.logo_url || IconUnknown}
              chainServerId={asset.chain}
              noRound={false}
            />

            <span className="ml-[8px]">{asset.name || 'Unknown'}</span>
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
        const asset = row.$assetParent;
        if (!asset) return null;

        if (asset.type === 'nft' && asset.nftContract) {
          const chainItem = findChainByServerID(
            asset.chain as Chain['serverId']
          );
          return (
            <span className="capitalize inline-flex items-center">
              Collection
              <img
                onClick={() => {
                  if (!chainItem) return;
                  openInTab(
                    chainItem?.scanLink.replace(
                      /tx\/_s_/,
                      `address/${asset.id}`
                    ),
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
        } else if (asset.type === 'nft' && asset.nftToken) {
          return <span className="capitalize">NFT</span>;
        }

        return <span className="capitalize">{asset.type}</span>;
      },
      width: 140,
    },
    // Approved Amount
    {
      title: () => <span>{'Approved Amount'}</span>,
      key: 'approvedAmount',
      dataIndex: 'key',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      sorter: (a, b) =>
        getSpenderApprovalAmount(a).bigValue.gte(
          getSpenderApprovalAmount(b).bigValue
        )
          ? 1
          : -1,
      sortOrder:
        sortedInfo.columnKey === 'approvedAmount' ? sortedInfo.order : null,
      render: (_, spender) => {
        const asset = spender.$assetParent;
        if (!asset) return null;

        if (asset.type === 'token') {
          const spendValues = getSpenderApprovalAmount(spender);
          return spendValues.isUnlimited
            ? 'Unlimited'
            : `${spendValues.stepNumberText} ${asset.name}`;
        }

        if (asset.type === 'nft' && asset.nftContract) {
          return '1 Collection';
        }

        return `${asset.nftToken?.is_erc721 ? 1 : 1} NFT`;
      },
      width: 160,
    },
    // Approve Spender
    {
      title: () => <span>{'Approve Spender'}</span>,
      key: 'approveSpender',
      dataIndex: 'key',
      render: (_, spender) => {
        const asset = spender.$assetParent;
        if (!asset) return null;
        const chainItem = findChainByServerID(asset.chain as Chain['serverId']);
        // if (!chainItem) return null;

        // it maybe null
        const protocol = spender.protocol;

        return (
          <div className="flex items-center">
            <IconWithChain
              width="24px"
              height="24px"
              hideConer
              iconUrl={protocol?.logo_url || IconUnknown}
              chainServerId={asset?.chain}
              noRound={asset.type === 'nft'}
            />

            <NameAndAddress.SafeCopy
              className="ml-[6px]"
              address={spender.id || ''}
              chainEnum={chainItem?.enum}
              addressSuffix={
                <span className="contract-name ml-[4px]">
                  ({protocol?.name || 'Unknown'})
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
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      sorter: (a, b) => (a.last_approve_at || 0) - (b.last_approve_at || 0),
      sortOrder:
        sortedInfo.columnKey === 'approveTime' ? sortedInfo.order : null,
      render: (_, row) => {
        const time = row.last_approve_at;

        return formatTimeFromNow(time ? time * 1e3 : 0);
      },
      width: 160 + 20,
    },
  ];

  return columnsForAsset;
}

type PageTableProps<T extends ContractApprovalItem | AssetApprovalSpender> = {
  isLoading: boolean;
  dataSource: T[];
  containerHeight: number;
  onClickRow?: (e: React.MouseEvent, record: T) => void;
  vGridRef: React.RefObject<VGrid>;
};
function TableByContracts({
  isLoading,
  dataSource,
  containerHeight,
  onClickRow,
  vGridRef,
}: PageTableProps<ContractApprovalItem>) {
  const [sortedInfo, setSortedInfo] = useState<
    SorterResult<ContractApprovalItem>
  >({
    columnKey: 'approvalTime',
    order: DEFAULT_SORT_ORDER,
  });

  const handleChange: TableProps<ContractApprovalItem>['onChange'] = useCallback(
    (pagination, filters, sorter) => {
      setSortedInfo((prev) => ({
        ...sorter,
        order: sorter.order ?? getNextSort(prev.order) ?? DEFAULT_SORT_ORDER,
      }));
    },
    []
  );

  const getContractListTotalHeight = useCallback(
    (rows: readonly ContractApprovalItem[]) => {
      return rows.reduce((accu, row) => {
        if (isRiskyContract(row)) {
          accu += RISKY_ROW_HEIGHT;
        } else {
          accu += ROW_HEIGHT;
        }
        return accu;
      }, 0);
    },
    []
  );

  return (
    <VirtualTable<ContractApprovalItem>
      loading={isLoading}
      vGridRef={vGridRef}
      columns={getColumnsForContract({
        sortedInfo: sortedInfo,
      })}
      dataSource={dataSource}
      scroll={{ y: containerHeight, x: '100%' }}
      onClickRow={onClickRow}
      getTotalHeight={getContractListTotalHeight}
      getRowHeight={(row) => {
        if (isRiskyContract(row)) {
          return RISKY_ROW_HEIGHT;
        }

        return ROW_HEIGHT;
      }}
      onChange={handleChange}
    />
  );
}

function TableByAssetSpenders({
  isLoading,
  dataSource,
  containerHeight,
  onClickRow,
  vGridRef,
}: PageTableProps<AssetApprovalSpender>) {
  const [sortedInfo, setSortedInfo] = useState<
    SorterResult<AssetApprovalSpender>
  >({
    columnKey: 'approveTime',
    order: DEFAULT_SORT_ORDER,
  });

  const handleChange: TableProps<AssetApprovalSpender>['onChange'] = useCallback(
    (pagination, filters, sorter) => {
      setSortedInfo((prev) => ({
        ...sorter,
        order: sorter.order ?? getNextSort(prev.order) ?? DEFAULT_SORT_ORDER,
      }));
    },
    []
  );

  return (
    <VirtualTable<AssetApprovalSpender>
      loading={isLoading}
      vGridRef={vGridRef}
      columns={getColumnsForAsset({
        sortedInfo: sortedInfo,
      })}
      dataSource={dataSource}
      scroll={{ y: containerHeight, x: '100%' }}
      onClickRow={onClickRow}
      getRowHeight={(row) => ROW_HEIGHT}
      onChange={handleChange}
    />
  );
}

const ApprovalManagePage = () => {
  useEffect(() => {
    const listener = (payload: any) => {
      // message.info({
      //   type: 'info',
      //   content: (
      //     <span className="text-white">
      //       Switching to a new address. Please wait for the page to refresh.
      //     </span>
      //   ),
      // });
      // setTimeout(() => {
      //   window.location.reload();
      // }, 1200);
      window.location.reload();
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

  const { yValue } = useTableScrollableHeight();

  const [visibleRevokeModal, setVisibleRevokeModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<ApprovalItem>();
  const handleClickRow = React.useCallback(
    (e: React.MouseEvent, record: ApprovalItem) => {
      // if (!(e.target as any).closest('.my-approved-assets')) return;
      setSelectedItem(record);
      setVisibleRevokeModal(true);
    },
    []
  );

  const [revokeMap, setRevokeMap] = React.useState<Record<string, any[]>>({});
  const revokeList = Object.values(revokeMap).flat();
  const wallet = useWallet();
  const handleRevoke = React.useCallback(() => {
    wallet
      .revoke({ list: revokeList })
      .then(() => {
        setVisibleRevokeModal(false);
        setRevokeMap({});
      })
      .catch((err) => {
        console.log(err);
      });
  }, [revokeList]);

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
            {filterType === 'contract' && (
              <TableByContracts
                isLoading={isLoading}
                vGridRef={vGridRef}
                containerHeight={yValue}
                dataSource={displaySortedContractList}
                onClickRow={handleClickRow}
              />
            )}
            {filterType === 'assets' && (
              <TableByAssetSpenders
                isLoading={isLoading}
                vGridRef={vGridRef}
                containerHeight={yValue}
                dataSource={displaySortedAssetsList}
              />
            )}
          </div>
          {selectedItem ? (
            <RevokeApprovalModal
              item={selectedItem}
              visible={visibleRevokeModal}
              onClose={() => {
                setVisibleRevokeModal(false);
              }}
              onConfirm={(list) => {
                setRevokeMap((prev) => ({
                  ...prev,
                  [selectedItem!.id]: list,
                }));
              }}
              revokeList={revokeMap[selectedItem!.id]}
            />
          ) : null}
        </main>
        <div className="mt-[50px] text-center absolute bottom-80">
          <RevokeButton revokeList={revokeList} onRevoke={handleRevoke} />
        </div>
      </div>
    </div>
  );
};

export default ApprovalManagePage;
