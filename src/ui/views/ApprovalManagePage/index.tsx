import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Alert, Input, Tooltip } from 'antd';
import type { ColumnType, TableProps } from 'antd/lib/table';
import { InfoCircleOutlined } from '@ant-design/icons';

import { formatUsdValue, openInTab, useWallet } from 'ui/utils';
import './style.less';
import eventBus from '@/eventBus';

import { Chain } from '@debank/common';
import { findChainByServerID, makeTokenFromChain } from '@/utils/chain';

import {
  HandleClickTableRow,
  IVGridContextualPayload,
  VirtualTable,
} from './components/Table';
import { VariableSizeGrid as VGrid } from 'react-window';
import PillsSwitch from './components/SwitchPills';

import IconSearch from 'ui/assets/search.svg';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';

import IconQuestion from './icons/question.svg';
import IconRowArrowRight from './icons/row-arrow-right.svg';
import IconCheckboxChecked from './icons/check-checked.svg';
import IconCheckboxIndeterminate from './icons/check-indeterminate.svg';
import IconCheckboxUnchecked from './icons/check-unchecked.svg';
import IconExternal from './icons/icon-share.svg';

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
  RiskNumMap,
  ApprovalSpenderItemToBeRevoked,
  compareAssetSpenderByAmount,
  compareAssetSpenderByType,
} from '@/utils/approval';
import { ellipsisAddress } from '@/ui/utils/address';
import clsx from 'clsx';
import {
  checkCompareContractItem,
  formatTimeFromNow,
  findIndexRevokeList,
  isRiskyContract,
  toRevokeItem,
  encodeRevokeItemIndex,
  getFinalRiskInfo,
  openScanLinkFromChainItem,
} from './utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { SorterResult } from 'antd/lib/table/interface';
import { RevokeApprovalModal } from './components/RevokeApprovalModal';
import { RISKY_ROW_HEIGHT, ROW_HEIGHT } from './constant';
import { RevokeButton } from './components/RevokeButton';
import SearchInput from './components/SearchInput';
import { useInspectRowItem } from './components/ModalDebugRowItem';
import { IS_WINDOWS } from '@/constant';
import { ensureSuffix } from '@/utils/string';
import ApprovalsNameAndAddr from './components/NameAndAddr';

const DEFAULT_SORT_ORDER = 'descend';
function getNextSort(currentSort?: 'ascend' | 'descend' | null) {
  return currentSort === 'ascend' ? 'descend' : ('ascend' as const);
}
const DEFAULT_SORT_ORDER_TUPLE = ['descend', 'ascend'] as const;

type IHandleChangeSelectedSpenders<T extends ApprovalItem> = (ctx: {
  approvalItem: T;
  selectedRevokeItems: ApprovalSpenderItemToBeRevoked[];
}) => any;

function getColumnsForContract({
  sortedInfo,
  selectedRows = [],
  onChangeSelectedContractSpenders,
}: {
  sortedInfo: SorterResult<ContractApprovalItem>;
  selectedRows: any[];
  onChangeSelectedContractSpenders: IHandleChangeSelectedSpenders<ContractApprovalItem>;
}) {
  const columnsForContract: ColumnType<ContractApprovalItem>[] = [
    {
      title: null,
      key: 'selection',
      className: 'J_selection',
      render: (_, row) => {
        const contractList = row.list;
        const selectedContracts = contractList.filter((contract) => {
          return findIndexRevokeList(selectedRows, row, contract) > -1;
        });

        const isIndeterminate =
          selectedContracts.length > 0 &&
          selectedContracts.length < contractList.length;

        return (
          <div
            className="block h-[100%] w-[100%] flex items-center justify-center"
            onClick={(evt) => {
              evt.stopPropagation();

              const nextSelectAll =
                isIndeterminate || selectedContracts.length === 0;
              const revokeItems = nextSelectAll
                ? (contractList
                    .map((contract) => {
                      return toRevokeItem(row, contract);
                    })
                    .filter(Boolean) as ApprovalSpenderItemToBeRevoked[])
                : [];

              onChangeSelectedContractSpenders({
                approvalItem: row,
                selectedRevokeItems: revokeItems,
              });
            }}
          >
            {isIndeterminate ? (
              <img
                className="J_indeterminate w-[20px] h-[20px]"
                src={IconCheckboxIndeterminate}
              />
            ) : selectedContracts.length ? (
              <img
                className="J_checked w-[20px] h-[20px]"
                src={IconCheckboxChecked}
              />
            ) : (
              <img
                className="J_unchecked w-[20px] h-[20px]"
                src={IconCheckboxUnchecked}
              />
            )}
          </div>
        );
      },
      width: 80,
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

        const contractName = row.name || 'Unknown';

        return (
          <div className="flex flex-col justify-between">
            <div className="contract-basic-info flex items-center">
              <IconWithChain
                width="18px"
                height="18px"
                hideConer
                hideChainIcon
                iconUrl={chainItem?.logo || IconUnknown}
                chainServerId={chainItem.serverId}
                noRound={false}
              />

              <ApprovalsNameAndAddr
                className="ml-[6px]"
                addressClass=""
                address={row.id}
                chainEnum={chainItem.enum}
                addressSuffix={
                  <>
                    <Tooltip
                      overlayClassName="J-table__tooltip disable-ant-overwrite"
                      overlay={contractName}
                    >
                      <span className="contract-name ml-[4px]">
                        ({row.name || 'Unknown'})
                      </span>
                    </Tooltip>
                    <img
                      onClick={(evt) => {
                        evt.stopPropagation();
                        openScanLinkFromChainItem(chainItem?.scanLink, row.id);
                      }}
                      src={IconExternal}
                      className={clsx('ml-6 w-[16px] h-[16px] cursor-pointer')}
                    />
                  </>
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
      width: 320,
    },
    // Contract Trust value
    {
      title: (props) => {
        return (
          <span className="inline-flex items-center justify-center">
            {'Contract Trust value'}
            <Tooltip
              overlayClassName="J-table__tooltip tip-column-contract-trust-value disable-ant-overwrite"
              overlay={
                <div className="text-[12px]">
                  <p>
                    Trust value refers to the total asset value approved and
                    exposed to this contract. A low trust value indicates either
                    risk or inactivity for 180 days.
                  </p>
                </div>
              }
              // visible
            >
              <img
                className="ml-[4px] w-[12px] h-[12px] relative top-[1px]"
                src={IconQuestion}
              />
            </Tooltip>
          </span>
        );
      },
      key: 'contractTrustValue',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      showSorterTooltip: false,
      sorter: (a, b) => {
        const checkResult = checkCompareContractItem(
          a,
          b,
          sortedInfo,
          'contractTrustValue'
        );
        if (checkResult.shouldEarlyReturn)
          return checkResult.keepRiskFirstReturnValue;

        return (
          a.$riskAboutValues.risk_exposure_usd_value -
          b.$riskAboutValues.risk_exposure_usd_value
        );
      },
      sortOrder:
        sortedInfo.columnKey === 'contractTrustValue' ? sortedInfo.order : null,
      render(_, row) {
        if (row.type !== 'contract') return null;

        const isDanger =
          row.$contractRiskEvaluation.extra.clientExposureScore >=
          RiskNumMap.danger;
        const isWarning =
          !isDanger &&
          row.$contractRiskEvaluation.extra.clientExposureScore >=
            RiskNumMap.warning;

        const isRisk = isDanger || isWarning;

        return (
          <Tooltip
            overlayClassName={clsx(
              'J-risk-cell__tooltip disable-ant-overwrite tip-trust-value',
              {
                'is-warning': isWarning,
                'is-danger': isDanger,
              }
            )}
            overlay={
              <div className="text-[12px]">
                {isWarning && <p>{'The contract trust value < $100,000'}</p>}
                {isDanger && <p>{'The  contract trust value < $10,000'}</p>}
              </div>
            }
            {...(!isDanger &&
              !isWarning && {
                visible: false,
              })}
            // // leave here for debug
            // {...(isDanger || isWarning) && {
            //   visible: true,
            // }}
          >
            <span
              className={clsx(isRisk && 'J-risk-cell__text', {
                'is-warning': isWarning,
                'is-danger': isDanger,
              })}
            >
              {formatUsdValue(
                row.$riskAboutValues.risk_exposure_usd_value || 0
              )}
            </span>
          </Tooltip>
        );
      },
      width: 180,
    },
    // 24h revoke users
    {
      title: () => <span>{'24h revoke users'}</span>,
      key: 'recentRevokes',
      dataIndex: 'revoke_user_count',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      showSorterTooltip: false,
      sorter: (a, b) => {
        const checkResult = checkCompareContractItem(
          a,
          b,
          sortedInfo,
          'recentRevokes'
        );
        if (checkResult.shouldEarlyReturn)
          return checkResult.keepRiskFirstReturnValue;

        return (
          a.$riskAboutValues.revoke_user_count -
          b.$riskAboutValues.revoke_user_count
        );
      },
      sortOrder:
        sortedInfo.columnKey === 'recentRevokes' ? sortedInfo.order : null,
      render: (_, row) => {
        if (row.type !== 'contract') return null;

        const isDanger =
          row.$contractRiskEvaluation.extra.clientApprovalScore >=
          RiskNumMap.danger;
        const isWarning =
          !isDanger &&
          row.$contractRiskEvaluation.extra.clientApprovalScore >=
            RiskNumMap.warning;

        const isRisk = isDanger || isWarning;

        return (
          <Tooltip
            overlayClassName={clsx(
              'J-risk-cell__tooltip disable-ant-overwrite tip-recent-revokes',
              {
                'is-warning': isWarning,
                'is-danger': isDanger,
              }
            )}
            overlay={
              <div className="text-[12px]">
                {isWarning && (
                  <p>
                    Recent revokes are greater than double the number of newly
                    approved users.
                  </p>
                )}
                {isDanger && (
                  <p>
                    Recent revokes are greater than 4 times the number of newly
                    approved users.
                  </p>
                )}
                <p>
                  Newly approved users(24h):{' '}
                  {row.$riskAboutValues.approve_user_count}
                </p>
                <p>
                  Recent revokes(24h): {row.$riskAboutValues.revoke_user_count}
                </p>
              </div>
            }
            {...(!isDanger &&
              !isWarning && {
                visible: false,
              })}
            // // leave here for debug
            // {...(isDanger || isWarning) && {
            //   visible: true,
            // }}
          >
            <span
              className={clsx(isRisk && 'J-risk-cell__text', {
                'is-warning': isWarning,
                'is-danger': isDanger,
              })}
            >
              {row.$riskAboutValues.revoke_user_count}
            </span>
          </Tooltip>
        );
      },
      width: 160,
    },
    // My Approval Time
    {
      title: () => <span>{'My Approval Time'}</span>,
      key: 'contractApprovalTime',
      dataIndex: 'last_approve_at',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      showSorterTooltip: false,
      sorter: (a, b) => {
        const checkResult = checkCompareContractItem(
          a,
          b,
          sortedInfo,
          'contractApprovalTime'
        );
        if (checkResult.shouldEarlyReturn)
          return checkResult.keepRiskFirstReturnValue;

        return (
          a.$riskAboutValues.last_approve_at -
          b.$riskAboutValues.last_approve_at
        );
      },
      sortOrder:
        sortedInfo.columnKey === 'contractApprovalTime'
          ? sortedInfo.order
          : null,
      render: (_, row) => {
        const time = row.$riskAboutValues.last_approve_at;

        return formatTimeFromNow(time ? time * 1e3 : 0);
      },
      width: 140,
    },
    // My Approved Assets
    {
      title: () => <span>{'My Approved Assets'}</span>,
      align: 'right',
      className: clsx('J_contracts_last_column', IS_WINDOWS && 'is-windows'),
      key: 'myApprovedAssets',
      dataIndex: 'approve_user_count',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      showSorterTooltip: false,
      sorter: (a, b) => {
        const checkResult = checkCompareContractItem(
          a,
          b,
          sortedInfo,
          'myApprovedAssets'
        );
        if (checkResult.shouldEarlyReturn)
          return checkResult.keepRiskFirstReturnValue;

        return a.list.length - b.list.length;
      },
      sortOrder:
        sortedInfo.columnKey === 'myApprovedAssets' ? sortedInfo.order : null,
      render: (_, row) => {
        const contractList = (row.list as any) as ContractApprovalItem[];
        const selectedContracts = contractList.filter((contract) => {
          // @ts-expect-error narrow type failure
          return findIndexRevokeList(selectedRows, row, contract) > -1;
        });

        return (
          <div className="flex items-center justify-end w-[100%]">
            <span className="block">
              {contractList.length}
              {!selectedContracts.length ? null : (
                <span className="J_selected_count_text ml-[2px]">
                  ({selectedContracts.length})
                </span>
              )}
            </span>

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
  selectedRows,
}: {
  sortedInfo: SorterResult<AssetApprovalSpender>;
  selectedRows: any[];
}) {
  const isSelected = (record: AssetApprovalSpender) => {
    return (
      findIndexRevokeList(
        selectedRows,
        record.$assetContract!,
        record.$assetToken!
      ) > -1
    );
  };
  const columnsForAsset: ColumnType<AssetApprovalSpender>[] = [
    {
      title: null,
      key: 'selection',
      render: (_, row) => {
        return (
          <div className="block h-[100%] w-[100%] flex items-center justify-center">
            {isSelected(row) ? (
              <img
                className="J_checked w-[20px] h-[20px]"
                src={IconCheckboxChecked}
              />
            ) : (
              <img
                className="J_unchecked w-[20px] h-[20px]"
                src={IconCheckboxUnchecked}
              />
            )}
          </div>
        );
      },
      width: 80,
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
        if (!chainItem?.enum) return null;

        const fullName =
          asset.type === 'nft' && asset.nftToken
            ? ensureSuffix(
                asset.name || 'Unknown',
                ` #${asset.nftToken.inner_id}`
              )
            : asset.name || 'Unknown';

        return (
          <div className="flex items-center font-[500]">
            <IconWithChain
              width="24px"
              height="24px"
              hideConer
              iconUrl={asset?.logo_url || IconUnknown}
              chainServerId={asset.chain}
              noRound={false}
            />

            <Tooltip
              overlayClassName="J-table__tooltip disable-ant-overwrite"
              overlay={fullName}
            >
              <span className="ml-[8px] asset-name">{fullName}</span>
            </Tooltip>
          </div>
        );
      },
      width: 200,
    },
    // Type
    {
      title: () => <span>{'Type'}</span>,
      key: 'assetType',
      dataIndex: 'type',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      showSorterTooltip: false,
      sorter: (a, b) => {
        let comparison = compareAssetSpenderByType(a, b);
        if (comparison) return comparison;

        comparison = compareAssetSpenderByAmount(a, b);
        const isColumnAsc =
          sortedInfo.columnKey === 'assetType' && sortedInfo.order === 'ascend';

        return isColumnAsc ? -comparison : comparison;
      },
      sortOrder: sortedInfo.columnKey === 'assetType' ? sortedInfo.order : null,
      render: (_, row) => {
        const asset = row.$assetParent;
        if (!asset) return null;

        if (asset.type === 'nft') {
          const chainItem = findChainByServerID(
            asset.chain as Chain['serverId']
          );

          const imgNode = (
            <img
              onClick={(evt) => {
                evt.stopPropagation();
                openScanLinkFromChainItem(chainItem?.scanLink, asset.id);
              }}
              src={IconExternal}
              className={clsx('ml-6 w-[16px] h-[16px] cursor-pointer')}
            />
          );

          if (asset.nftContract) {
            return (
              <span className="capitalize inline-flex items-center">
                Collection
                {imgNode}
              </span>
            );
          } else if (asset.nftToken) {
            return (
              <span className="capitalize inline-flex items-center">
                NFT
                {imgNode}
              </span>
            );
          }
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
      showSorterTooltip: false,
      sorter: (a, b) => compareAssetSpenderByAmount(a, b),
      sortOrder:
        sortedInfo.columnKey === 'approvedAmount' ? sortedInfo.order : null,
      render: (_, spender) => {
        const asset = spender.$assetParent;
        if (!asset) return null;

        const spendValues = getSpenderApprovalAmount(spender);

        return spendValues.displayText;
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

        const protocolName = protocol?.name || 'Unknown';

        return (
          <div className="flex items-center">
            <IconWithChain
              width="18px"
              height="18px"
              hideConer
              hideChainIcon
              iconUrl={chainItem?.logo || IconUnknown}
              chainServerId={asset?.chain}
              noRound={asset.type === 'nft'}
            />
            <ApprovalsNameAndAddr
              className="ml-[6px]"
              addressClass=""
              address={spender.id || ''}
              chainEnum={chainItem?.enum}
              addressSuffix={
                <>
                  <Tooltip
                    overlayClassName="J-table__tooltip disable-ant-overwrite"
                    overlay={protocolName}
                  >
                    <span className="contract-name ml-[4px]">
                      ({protocolName})
                    </span>
                  </Tooltip>
                  <img
                    onClick={(evt) => {
                      evt.stopPropagation();
                      openScanLinkFromChainItem(chainItem?.scanLink, asset.id);
                    }}
                    src={IconExternal}
                    className={clsx('ml-6 w-[16px] h-[16px] cursor-pointer')}
                  />
                </>
              }
              openExternal={false}
            />
          </div>
        );
      },
      width: 300,
    },
    // My Approval Time
    {
      title: () => <span className="pl-[20px]">{'My Approval Time'}</span>,
      key: 'assetApproveTime',
      dataIndex: 'key',
      sortDirections: [...DEFAULT_SORT_ORDER_TUPLE],
      showSorterTooltip: false,
      sorter: (a, b) => (a.last_approve_at || 0) - (b.last_approve_at || 0),
      sortOrder:
        sortedInfo.columnKey === 'assetApproveTime' ? sortedInfo.order : null,
      render: (_, row) => {
        const time = row.last_approve_at;

        return formatTimeFromNow(time ? time * 1e3 : 0);
      },
      width: 160 + 20,
    },
  ];

  return columnsForAsset;
}

const getRowHeight = (row: ContractApprovalItem) => {
  if (isRiskyContract(row)) return RISKY_ROW_HEIGHT;

  return ROW_HEIGHT;
};

const getCellKey = (params: IVGridContextualPayload<ContractApprovalItem>) => {
  return `${params.rowIndex}-${params.columnIndex}-${params.record.id}`;
};

const getCellClassName = (
  ctx: IVGridContextualPayload<ContractApprovalItem>
) => {
  const riskResult = getFinalRiskInfo(ctx.record);

  return clsx(
    riskResult.isServerRisk && 'is-contract-row__risky'
    // riskResult.isServerDanger && 'is-contract-row__danger',
    // riskResult.isServerWarning && 'is-contract-row__warning'
  );
};

type PageTableProps<T extends ContractApprovalItem | AssetApprovalSpender> = {
  isLoading: boolean;
  dataSource: T[];
  containerHeight: number;
  selectedRows: ApprovalSpenderItemToBeRevoked[];
  onClickRow?: HandleClickTableRow<T>;
  vGridRef: React.RefObject<VGrid>;
  className?: string;
};
function TableByContracts({
  isLoading,
  dataSource,
  containerHeight,
  selectedRows = [],
  onClickRow,
  vGridRef,
  className,
  onChangeSelectedContractSpenders,
}: PageTableProps<ContractApprovalItem> & {
  onChangeSelectedContractSpenders: IHandleChangeSelectedSpenders<ContractApprovalItem>;
}) {
  const [sortedInfo, setSortedInfo] = useState<
    SorterResult<ContractApprovalItem>
  >({
    columnKey: 'contractTrustValue',
    order: 'ascend',
  });

  const handleChange: TableProps<ContractApprovalItem>['onChange'] = useCallback(
    (pagination, filters, sorter) => {
      setSortedInfo((prev) => ({
        ...sorter,
        order: sorter.order ?? getNextSort(prev.order) ?? DEFAULT_SORT_ORDER,
      }));
      vGridRef.current?.resetAfterRowIndex(0, true);
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

  const { onClickRowInspection } = useInspectRowItem(onClickRow);

  const columnsForContracts = useMemo(() => {
    return getColumnsForContract({
      selectedRows,
      sortedInfo: sortedInfo,
      onChangeSelectedContractSpenders,
    });
  }, [selectedRows, sortedInfo, onChangeSelectedContractSpenders]);

  return (
    <VirtualTable<ContractApprovalItem>
      loading={isLoading}
      vGridRef={vGridRef}
      className={clsx(className, 'J_table_by_contracts')}
      markHoverRow={false}
      columns={columnsForContracts}
      sortedInfo={sortedInfo}
      dataSource={dataSource}
      scroll={{ y: containerHeight, x: '100%' }}
      onClickRow={onClickRowInspection}
      getTotalHeight={getContractListTotalHeight}
      getRowHeight={getRowHeight}
      getCellKey={getCellKey}
      getCellClassName={getCellClassName}
      onChange={handleChange}
    />
  );
}

function TableByAssetSpenders({
  isLoading,
  dataSource,
  containerHeight,
  onClickRow,
  selectedRows = [],
  vGridRef,
  className,
}: PageTableProps<AssetApprovalSpender>) {
  const [sortedInfo, setSortedInfo] = useState<
    SorterResult<AssetApprovalSpender>
  >({
    columnKey: 'assetApproveTime',
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

  const { onClickRowInspection } = useInspectRowItem(onClickRow);

  return (
    <VirtualTable<AssetApprovalSpender>
      loading={isLoading}
      vGridRef={vGridRef}
      className={clsx(className, 'J_table_by_assets')}
      markHoverRow={false}
      columns={getColumnsForAsset({
        sortedInfo: sortedInfo,
        selectedRows,
      })}
      sortedInfo={sortedInfo}
      dataSource={dataSource}
      scroll={{ y: containerHeight, x: '100%' }}
      onClickRow={onClickRowInspection}
      // getRowHeight={(row) => ROW_HEIGHT}
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

    vGridRefContracts,
    vGridRefAsset,
  } = useApprovalsPage();

  const { yValue } = useTableScrollableHeight();

  const [visibleRevokeModal, setVisibleRevokeModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<ApprovalItem>();
  const handleClickContractRow: HandleClickTableRow<ApprovalItem> = React.useCallback(
    (ctx) => {
      setSelectedItem(ctx.record);
      setVisibleRevokeModal(true);
    },
    []
  );
  const [assetRevokeList, setAssetRevokeList] = React.useState<
    ApprovalSpenderItemToBeRevoked[]
  >([]);
  const handleClickAssetRow: HandleClickTableRow<AssetApprovalSpender> = React.useCallback(
    (ctx) => {
      const record = ctx.record;
      const index = findIndexRevokeList(
        assetRevokeList,
        record.$assetContract!,
        record.$assetToken!
      );
      if (index > -1) {
        setAssetRevokeList((prev) => prev.filter((item, i) => i !== index));
      } else {
        const revokeItem = toRevokeItem(
          record.$assetContract!,
          record.$assetToken!
        );
        if (revokeItem) {
          setAssetRevokeList((prev) => [...prev, revokeItem]);
        }
      }
    },
    [assetRevokeList]
  );

  const [contractRevokeMap, setContractRevokeMap] = React.useState<
    Record<string, ApprovalSpenderItemToBeRevoked[]>
  >({});
  const contractRevokeList = useMemo(() => {
    return Object.values(contractRevokeMap).flat();
  }, [contractRevokeMap]);

  const selectedItemKey = useMemo(() => {
    return selectedItem ? encodeRevokeItemIndex(selectedItem) : '';
  }, [selectedItem]);

  const currentRevokeList =
    filterType === 'contract'
      ? contractRevokeList
      : filterType === 'assets'
      ? assetRevokeList
      : [];

  const wallet = useWallet();
  const handleRevoke = React.useCallback(() => {
    wallet
      .revoke({ list: currentRevokeList })
      .then(() => {
        setVisibleRevokeModal(false);
        setContractRevokeMap({});
        setAssetRevokeList([]);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [currentRevokeList]);

  const onChangeSelectedContractSpenders: IHandleChangeSelectedSpenders<ContractApprovalItem> = useCallback(
    (ctx) => {
      const selectedItemKey = encodeRevokeItemIndex(ctx.approvalItem);

      setContractRevokeMap((prev) => ({
        ...prev,
        [selectedItemKey]: ctx.selectedRevokeItems,
      }));
    },
    []
  );

  return (
    <div className="approvals-manager-page">
      <div className="approvals-manager">
        <header className="approvals-manager__header">
          <div className="title">
            Approvals on {ellipsisAddress(account?.address || '')}
            {account?.alianName && (
              <span className="text-[#4b4d59] text-[20px] font-normal">
                {' '}
                ({account?.alianName})
              </span>
            )}
          </div>
        </header>

        <main>
          <div className="approvals-manager__table-tools">
            <PillsSwitch
              value={filterType}
              options={SwitchPills}
              onChange={(key) => setFilterType(key)}
            />

            <SearchInput
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              prefix={<img src={IconSearch} />}
              className="search-input"
              suffix={<span />}
              placeholder={`Search ${
                filterType === 'contract' ? 'contract' : 'assets'
              } by name/address`}
            />
          </div>

          <div className="approvals-manager__table-wrapper">
            <TableByContracts
              isLoading={isLoading}
              className={filterType === 'contract' ? '' : 'hidden'}
              vGridRef={vGridRefContracts}
              containerHeight={yValue}
              dataSource={displaySortedContractList}
              onClickRow={handleClickContractRow}
              onChangeSelectedContractSpenders={
                onChangeSelectedContractSpenders
              }
              selectedRows={contractRevokeList}
            />

            <TableByAssetSpenders
              className={filterType === 'assets' ? '' : 'hidden'}
              isLoading={isLoading}
              vGridRef={vGridRefAsset}
              containerHeight={yValue}
              dataSource={displaySortedAssetsList}
              selectedRows={assetRevokeList}
              onClickRow={handleClickAssetRow}
            />
          </div>
          {selectedItem ? (
            <RevokeApprovalModal
              item={selectedItem}
              visible={visibleRevokeModal}
              onClose={() => {
                setVisibleRevokeModal(false);
              }}
              onConfirm={(list) => {
                setContractRevokeMap((prev) => ({
                  ...prev,
                  [selectedItemKey]: list,
                }));
              }}
              revokeList={contractRevokeMap[selectedItemKey]}
            />
          ) : null}
        </main>
        <div className="sticky-footer">
          <RevokeButton
            revokeList={currentRevokeList}
            onRevoke={handleRevoke}
          />
        </div>
      </div>
    </div>
  );
};

export default ApprovalManagePage;
