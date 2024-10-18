/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Alert, Tooltip } from 'antd';
import type { ColumnType, TableProps } from 'antd/lib/table';
import { InfoCircleOutlined } from '@ant-design/icons';

import { formatUsdValue, useWallet } from 'ui/utils';
import './style.less';

import { Chain, CHAINS_ENUM } from '@debank/common';
import { findChainByServerID } from '@/utils/chain';

import {
  HandleClickTableRow,
  IVGridContextualPayload,
  VirtualTable,
} from './components/Table';
import { VariableSizeGrid as VGrid } from 'react-window';
import PillsSwitch from '@/ui/component/PillsSwitch';

import IconSearch from 'ui/assets/search.svg';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';

import { ReactComponent as RcIconQuestionCC } from './icons/question-cc.svg';
import { ReactComponent as RcIconRowArrowRightCC } from './icons/row-arrow-right-cc.svg';
import { ReactComponent as RcIconExternal } from './icons/icon-share-cc.svg';
import { ReactComponent as RcIconEmpty } from '@/ui/assets/dashboard/asset-empty.svg';

import {
  IHandleChangeSelectedSpenders,
  useApprovalsPage,
  useSelectSpendersToRevoke,
  useTableScrollableHeight,
} from './useApprovalsPage';
import {
  ContractApprovalItem,
  AssetApprovalSpender,
  getSpenderApprovalAmount,
  RiskNumMap,
  compareAssetSpenderByAmount,
  compareAssetSpenderByType,
} from '@/utils/approval';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
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
  encodeRevokeItem,
  decodeRevokeItem,
  TableSelectResult,
} from './utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { SorterResult } from 'antd/lib/table/interface';
import { RevokeApprovalModal } from './components/RevokeApprovalModal';
import { RISKY_ROW_HEIGHT, ROW_HEIGHT } from './constant';
import { RevokeButton } from './components/RevokeButton';
import SearchInput from './components/SearchInput';
import { useInspectRowItem } from './components/ModalDebugRowItem';
import { IS_WINDOWS, KEYRING_CLASS } from '@/constant';
import ApprovalsNameAndAddr from './components/NameAndAddr';
import NetSwitchTabs, {
  useSwitchNetTab,
} from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { useTranslation } from 'react-i18next';
import { useReloadPageOnCurrentAccountChanged } from '@/ui/hooks/backgroundState/useAccount';
import { useTitle } from 'ahooks';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useConfirmRevokeModal } from './components/BatchRevoke/useConfirmRevokeModal';
import { useBatchRevokeModal } from './components/BatchRevoke/useBatchRevokeModal';
import { AssetRow } from './components/AssetRow';
import { SpenderRow } from './components/SpenderRow';
import { CheckboxRow } from './components/CheckboxRow';
import { ChainSelectorButton } from './components/ChainSelectorButton';

const DEFAULT_SORT_ORDER = 'descend';
function getNextSort(currentSort?: 'ascend' | 'descend' | null) {
  return currentSort === 'ascend' ? 'descend' : ('ascend' as const);
}
const DEFAULT_SORT_ORDER_TUPLE = ['descend', 'ascend'] as const;

function getColumnsForContract({
  sortedInfo,
  selectedRows = [],
  onChangeSelectedContractSpenders,
  t,
  toggleSelectAll,
  isSelectedAll,
  isIndeterminate,
}: {
  sortedInfo: SorterResult<ContractApprovalItem>;
  selectedRows: ApprovalSpenderItemToBeRevoked[];
  onChangeSelectedContractSpenders: IHandleChangeSelectedSpenders<ContractApprovalItem>;
  // t: ReturnType<typeof useTranslation>['t']
  toggleSelectAll: () => void;
  t: any;
} & TableSelectResult) {
  const columnsForContract: ColumnType<ContractApprovalItem>[] = [
    {
      title: () => (
        <CheckboxRow
          onClick={toggleSelectAll}
          isIndeterminate={isIndeterminate}
          isSelected={isSelectedAll}
        />
      ),
      key: 'selection',
      className: 'J_selection',
      render: (_, contractApproval) => {
        const selectedSpenderHosts = contractApproval.list.filter(
          (spenderHost) => {
            return (
              findIndexRevokeList(selectedRows, {
                item: contractApproval,
                spenderHost,
                itemIsContractApproval: true,
              }) > -1
            );
          }
        );

        const isIndeterminate =
          selectedSpenderHosts.length > 0 &&
          selectedSpenderHosts.length < contractApproval.list.length;

        return (
          <CheckboxRow
            onClick={(evt) => {
              evt.stopPropagation();

              const nextSelectAll =
                isIndeterminate || selectedSpenderHosts.length === 0;
              let revokeItems: ApprovalSpenderItemToBeRevoked[] = [];
              if (nextSelectAll) {
                const set = new Set<string>();
                contractApproval.list.forEach((spenderHost) => {
                  const revokeItem = toRevokeItem(
                    contractApproval,
                    spenderHost,
                    true
                  );
                  if (!revokeItem) return;
                  set.add(encodeRevokeItem(revokeItem));
                });
                revokeItems = [...set].map((key) => decodeRevokeItem(key));
              }

              onChangeSelectedContractSpenders({
                approvalItem: contractApproval,
                selectedRevokeItems: revokeItems,
              });
            }}
            isIndeterminate={isIndeterminate}
            isSelected={!!selectedSpenderHosts.length}
          />
        );
      },
      width: 80,
    },
    // Contract
    {
      title: () => (
        <span>
          {/* {'Contract'} */}
          {t('page.approvals.tableConfig.byContracts.columnTitle.contract')}
        </span>
      ),
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
                copyIconClass="text-r-neutral-body"
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
                    <ThemeIcon
                      onClick={(evt) => {
                        evt.stopPropagation();
                        openScanLinkFromChainItem(chainItem?.scanLink, row.id);
                      }}
                      src={RcIconExternal}
                      className={clsx(
                        'ml-6 w-[16px] h-[16px] cursor-pointer text-r-neutral-body'
                      )}
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
      width: 380,
    },
    // Contract Trust value
    {
      title: (props) => {
        return (
          <span className="inline-flex items-center justify-center">
            {/* {'Contract Trust value'} */}
            {t(
              'page.approvals.tableConfig.byContracts.columnTitle.contractTrustValue'
            )}
            <Tooltip
              overlayClassName="J-table__tooltip tip-column-contract-trust-value disable-ant-overwrite"
              overlay={
                <div className="text-[12px]">
                  <p>
                    {/* Trust value refers to the total asset value approved and
                    exposed to this contract. A low trust value indicates either
                    risk or inactivity for 180 days. */}
                    {t(
                      'page.approvals.tableConfig.byContracts.columnTip.contractTrustValue'
                    )}
                  </p>
                </div>
              }
              // placement='topRight'
              // visible
            >
              <ThemeIcon
                className={clsx(
                  'ml-[4px] w-[12px] h-[12px] relative',
                  IS_WINDOWS && 'top-[1px]',
                  'text-r-neutral-title1'
                )}
                src={RcIconQuestionCC}
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
          a.$riskAboutValues.risk_spend_usd_value -
          b.$riskAboutValues.risk_spend_usd_value
        );
      },
      sortOrder:
        sortedInfo.columnKey === 'contractTrustValue' ? sortedInfo.order : null,
      render(_, row) {
        if (row.type !== 'contract') return null;

        const isDanger =
          row.$contractRiskEvaluation.extra.clientSpendScore >=
          RiskNumMap.danger;
        const isWarning =
          !isDanger &&
          row.$contractRiskEvaluation.extra.clientSpendScore >=
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
                {isWarning && (
                  <p>
                    {/* {'The contract trust value < $100,000'} */}
                    {t(
                      'page.approvals.tableConfig.byContracts.columnTip.contractTrustValueWarning'
                    )}
                  </p>
                )}
                {isDanger && (
                  <p>
                    {/* {'The contract trust value < $10,000'} */}
                    {t(
                      'page.approvals.tableConfig.byContracts.columnTip.contractTrustValueDanger'
                    )}
                  </p>
                )}
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
              {formatUsdValue(row.$riskAboutValues.risk_spend_usd_value || 0)}
            </span>
          </Tooltip>
        );
      },
      width: 220,
    },
    // 24h Revoke Trends
    {
      title: () => (
        <span>
          {/* {'24h Revoke Trends'} */}
          {t('page.approvals.tableConfig.byContracts.columnTitle.revokeTrends')}
        </span>
      ),
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
      title: () => (
        <span>
          {t(
            'page.approvals.tableConfig.byContracts.columnTitle.myApprovalTime'
          )}
        </span>
      ),
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
      title: () => (
        <span>
          {/* {'My Approved Assets'} */}
          {t(
            'page.approvals.tableConfig.byContracts.columnTitle.myApprovedAssets'
          )}
        </span>
      ),
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
        const spenderHostList = row.list;
        const selectedContracts = spenderHostList.filter((spenderHost) => {
          return (
            findIndexRevokeList(selectedRows, {
              item: row,
              spenderHost,
              itemIsContractApproval: true,
            }) > -1
          );
        });

        return (
          <div className="flex items-center justify-end w-[100%]">
            <span className="block">
              {spenderHostList.length}
              {!selectedContracts.length ? null : (
                <span className="J_selected_count_text ml-[2px]">
                  ({selectedContracts.length})
                </span>
              )}
            </span>

            <ThemeIcon
              className="ml-[4px] text-r-neutral-title1"
              src={RcIconRowArrowRightCC}
            />
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
  t,
  toggleSelectAll,
  isSelectedAll,
  isIndeterminate,
}: {
  sortedInfo: SorterResult<AssetApprovalSpender>;
  selectedRows: ApprovalSpenderItemToBeRevoked[];
  // t: ReturnType<typeof useTranslation>['t']
  t: any;
  toggleSelectAll: () => void;
} & TableSelectResult) {
  const isSelected = (record: AssetApprovalSpender) => {
    return (
      findIndexRevokeList(selectedRows, {
        item: record.$assetContract!,
        spenderHost: record.$assetToken!,
        assetApprovalSpender: record,
      }) > -1
    );
  };

  const columnsForAsset: ColumnType<AssetApprovalSpender>[] = [
    {
      key: 'selection',
      title: () => (
        <CheckboxRow
          onClick={toggleSelectAll}
          isIndeterminate={isIndeterminate}
          isSelected={isSelectedAll}
        />
      ),
      render: (_, spender) => {
        return <CheckboxRow isSelected={isSelected(spender)} />;
      },
      width: 80,
    },
    // Asset
    {
      title: () => (
        <span>
          {t('page.approvals.tableConfig.byAssets.columnTitle.asset')}
        </span>
      ),
      key: 'asset',
      dataIndex: 'key',
      render: (_, row) => <AssetRow asset={row.$assetParent} />,
      width: 200,
    },
    // Type
    {
      title: () => (
        <span>
          {/* {'Type'} */}
          {t('page.approvals.tableConfig.byAssets.columnTitle.type')}
        </span>
      ),
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
            <ThemeIcon
              onClick={(evt) => {
                evt.stopPropagation();
                openScanLinkFromChainItem(chainItem?.scanLink, asset.id);
              }}
              src={RcIconExternal}
              className={clsx(
                'ml-6 w-[16px] h-[16px] cursor-pointer text-r-neutral-body'
              )}
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
      title: () => (
        <span>
          {/* {'Approved Amount'} */}
          {t('page.approvals.tableConfig.byAssets.columnTitle.approvedAmount')}
        </span>
      ),
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

        return (
          <div className="text-14 overflow-hidden">
            <div>
              <Tooltip
                overlayClassName="J-table__tooltip disable-ant-overwrite"
                // Approved Amount
                overlay={t(
                  'page.approvals.tableConfig.byAssets.columnCell.approvedAmount.tipApprovedAmount'
                )}
                align={{ offset: [0, 3] }}
                arrowPointAtCenter
              >
                <span className="text-r-neutral-title-1 truncate block">
                  {spendValues.displayAmountText}
                </span>
              </Tooltip>
            </div>
            <div className="mt-4">
              <Tooltip
                overlayClassName="J-table__tooltip disable-ant-overwrite"
                // My Balance
                overlay={t(
                  'page.approvals.tableConfig.byAssets.columnCell.approvedAmount.tipMyBalance'
                )}
                align={{ offset: [0, 3] }}
                arrowPointAtCenter
              >
                <span className="text-r-neutral-foot">
                  {spendValues.displayBalanceText}
                </span>
              </Tooltip>
            </div>
          </div>
        );
      },
      width: 160,
    },
    // Approved Spender
    {
      title: () => (
        <span>
          {/* {'Approved Spender'} */}
          {t('page.approvals.tableConfig.byAssets.columnTitle.approvedSpender')}
        </span>
      ),
      key: 'approveSpender',
      dataIndex: 'key',
      render: (_, spender) => <SpenderRow spender={spender} />,
      width: 400,
    },
    // My Approval Time
    {
      title: () => (
        <span className="pl-[20px]">
          {/* {'My Approval Time'} */}
          {t('page.approvals.tableConfig.byAssets.columnTitle.myApprovalTime')}
        </span>
      ),
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
  isDarkTheme?: boolean;
  isLoading: boolean;
  emptyStatus?: 'none' | 'no-matched' | false;
  dataSource: T[];
  containerHeight: number;
  selectedRows: ApprovalSpenderItemToBeRevoked[];
  onClickRow?: HandleClickTableRow<T>;
  vGridRef: React.RefObject<VGrid>;
  className?: string;
  toggleAllAssetRevoke?: (list: AssetApprovalSpender[]) => void;
  toggleAllContractRevoke?: (list: ContractApprovalItem[]) => void;
} & TableSelectResult;
function TableByContracts({
  isDarkTheme,
  isLoading,
  emptyStatus,
  dataSource,
  containerHeight,
  selectedRows = [],
  onClickRow,
  vGridRef,
  className,
  onChangeSelectedContractSpenders,
  toggleAllContractRevoke,
  isSelectedAll,
  isIndeterminate,
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
    [vGridRef]
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

  const { t } = useTranslation();

  const columnsForContracts = useMemo(() => {
    return getColumnsForContract({
      selectedRows,
      sortedInfo: sortedInfo,
      onChangeSelectedContractSpenders,
      toggleSelectAll: () => toggleAllContractRevoke?.(dataSource),
      isSelectedAll,
      isIndeterminate,
      t,
    });
  }, [
    dataSource,
    t,
    selectedRows,
    sortedInfo,
    onChangeSelectedContractSpenders,
    toggleAllContractRevoke,
    isSelectedAll,
    isIndeterminate,
  ]);

  return (
    <VirtualTable<ContractApprovalItem>
      loading={isLoading}
      vGridRef={vGridRef}
      className={clsx(className, 'J_table_by_contracts', isDarkTheme && 'dark')}
      markHoverRow={false}
      columns={columnsForContracts}
      sortedInfo={sortedInfo}
      emptyText={
        emptyStatus === 'no-matched'
          ? t('page.approvals.component.table.bodyEmpty.noMatchText')
          : t('page.approvals.component.table.bodyEmpty.noDataText')
      }
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
  emptyStatus,
  dataSource,
  containerHeight,
  onClickRow,
  selectedRows = [],
  vGridRef,
  className,
  toggleAllAssetRevoke,
  isSelectedAll,
  isIndeterminate,
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
  const { t } = useTranslation();

  const toggleSelectAll = () => toggleAllAssetRevoke?.(dataSource);

  return (
    <VirtualTable<AssetApprovalSpender>
      loading={isLoading}
      vGridRef={vGridRef}
      className={clsx(className, 'J_table_by_assets')}
      markHoverRow={false}
      columns={getColumnsForAsset({
        sortedInfo: sortedInfo,
        selectedRows,
        toggleSelectAll,
        isSelectedAll,
        isIndeterminate,
        t,
      })}
      sortedInfo={sortedInfo}
      emptyText={
        emptyStatus === 'no-matched'
          ? t('page.approvals.component.table.bodyEmpty.noMatchText')
          : t('page.approvals.component.table.bodyEmpty.noDataText')
      }
      dataSource={dataSource}
      scroll={{ y: containerHeight, x: '100%' }}
      onClickRow={onClickRowInspection}
      // getRowHeight={(row) => ROW_HEIGHT}
      onChange={handleChange}
    />
  );
}

const ApprovalManagePage = () => {
  useTitle('Approvals - Rabby Wallet');

  useReloadPageOnCurrentAccountChanged();

  const { t } = useTranslation();

  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();

  const { isDarkTheme } = useThemeMode();
  const [chain, setChain] = React.useState<CHAINS_ENUM>();

  const {
    isLoading,
    loadApprovals,
    searchKw,
    setSearchKw,
    account,
    displaySortedContractList,
    contractEmptyStatus,
    displaySortedAssetsList,
    assetEmptyStatus,

    filterType,
    setFilterType,

    vGridRefContracts,
    vGridRefAsset,
  } = useApprovalsPage({ isTestnet: selectedTab === 'testnet', chain });

  useEffect(() => {
    loadApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  const { yValue } = useTableScrollableHeight({ isShowTestnet });

  const [visibleRevokeModal, setVisibleRevokeModal] = React.useState(false);
  const [
    selectedContract,
    setSelectedContract,
  ] = React.useState<ContractApprovalItem>();
  const selectedContractKey = useMemo(() => {
    return selectedContract ? encodeRevokeItemIndex(selectedContract) : '';
  }, [selectedContract]);
  const handleClickContractRow: HandleClickTableRow<ContractApprovalItem> = React.useCallback(
    (ctx) => {
      setSelectedContract(ctx.record);
      setVisibleRevokeModal(true);
    },
    []
  );

  const {
    handleClickAssetRow,
    contractRevokeMap,
    contractRevokeList,
    contractSelectResult,
    assetRevokeList,
    assetSelectResult,
    revokeSummary,
    patchContractRevokeMap,
    clearRevoke,
    onChangeSelectedContractSpenders,
    toggleAllAssetRevoke,
    toggleAllContractRevoke,
  } = useSelectSpendersToRevoke({
    filterType,
    displaySortedContractList,
    displaySortedAssetsList,
  });

  const wallet = useWallet();
  const handleRevoke = React.useCallback(async () => {
    return wallet
      .revoke({ list: revokeSummary.currentRevokeList })
      .then(() => {
        setVisibleRevokeModal(false);
        clearRevoke();
      })
      .catch((err) => {
        console.log(err);
      });
  }, [wallet, clearRevoke, revokeSummary.currentRevokeList]);

  const batchRevokeModal = useBatchRevokeModal({
    accountType: account?.type,
    revokeList: revokeSummary.currentRevokeList,
    dataSource: displaySortedAssetsList,
    onDone: () => {
      loadApprovals();
      clearRevoke();
    },
    onClose: (needUpdate) => {
      if (needUpdate) {
        loadApprovals();
        clearRevoke();
      }
    },
  });
  const confirmRevokeModal = useConfirmRevokeModal({
    revokeListCount: revokeSummary.currentRevokeList.length,
    onBatchRevoke: () => batchRevokeModal.show(),
    onRevokeOneByOne: () => handleRevoke(),
    accountType: account?.type,
  });
  const enableBatchRevoke = React.useMemo(() => {
    return (
      account?.type === KEYRING_CLASS.PRIVATE_KEY ||
      account?.type === KEYRING_CLASS.MNEMONIC ||
      account?.type === KEYRING_CLASS.HARDWARE.LEDGER
    );
  }, [account]);
  const onRevoke = React.useCallback(() => {
    if (revokeSummary.currentRevokeList.length > 1 && enableBatchRevoke) {
      confirmRevokeModal.show();
    } else {
      handleRevoke();
    }
  }, [
    revokeSummary.currentRevokeList.length,
    confirmRevokeModal,
    handleRevoke,
    enableBatchRevoke,
  ]);

  return (
    <div
      className={clsx(
        'approvals-manager-page',
        isShowTestnet && 'with-switchnet-tabs'
      )}
    >
      <div className="approvals-manager">
        <header className="approvals-manager__header">
          {isShowTestnet && (
            <div className="tabs">
              <NetSwitchTabs value={selectedTab} onTabChange={onTabChange} />
            </div>
          )}
          <div className="title">
            {/* Approvals on {ellipsisAddress(account?.address || '')} */}
            {t('page.approvals.header.title', {
              address: ellipsisAddress(account?.address || ''),
            })}
            {account?.alianName && (
              <span className="text-r-neutral-foot text-[20px] font-normal">
                {' '}
                ({account?.alianName})
              </span>
            )}
          </div>
        </header>

        {selectedTab === 'mainnet' ? (
          <>
            <main>
              <div className="approvals-manager__table-tools">
                <PillsSwitch
                  value={filterType}
                  options={
                    [
                      {
                        key: 'contract',
                        // 'By Contracts'
                        label: t('page.approvals.tab-switch.contract'),
                      },
                      {
                        key: 'assets',
                        // 'By Assets'
                        label: t('page.approvals.tab-switch.assets'),
                      },
                    ] as const
                  }
                  onTabChange={(key) => setFilterType(key)}
                  itemClassname="text-[15px] w-[148px] h-[40px]"
                  itemClassnameActive="bg-r-neutral-bg-1"
                  itemClassnameInActive={
                    'text-r-neutral-body hover:text-r-blue-default'
                  }
                />

                <div className="flex items-center gap-x-12">
                  <SearchInput
                    value={searchKw}
                    onChange={(e) => setSearchKw(e.target.value)}
                    prefix={<img src={IconSearch} />}
                    className="search-input"
                    suffix={<span />}
                    placeholder={t('page.approvals.search.placeholder', {
                      type: filterType === 'contract' ? 'contract' : 'assets',
                    })}
                  />

                  <ChainSelectorButton
                    large
                    chain={chain}
                    setChain={setChain}
                  />
                </div>
              </div>

              <div className="approvals-manager__table-wrapper">
                <TableByContracts
                  isDarkTheme={isDarkTheme}
                  isLoading={isLoading}
                  className={filterType === 'contract' ? '' : 'hidden'}
                  vGridRef={vGridRefContracts}
                  containerHeight={yValue}
                  emptyStatus={contractEmptyStatus}
                  dataSource={displaySortedContractList}
                  onClickRow={handleClickContractRow}
                  onChangeSelectedContractSpenders={
                    onChangeSelectedContractSpenders
                  }
                  selectedRows={contractRevokeList}
                  toggleAllContractRevoke={toggleAllContractRevoke}
                  isSelectedAll={contractSelectResult.isSelectedAll}
                  isIndeterminate={contractSelectResult.isIndeterminate}
                />

                <TableByAssetSpenders
                  className={filterType === 'assets' ? '' : 'hidden'}
                  isLoading={isLoading}
                  vGridRef={vGridRefAsset}
                  containerHeight={yValue}
                  emptyStatus={assetEmptyStatus}
                  dataSource={displaySortedAssetsList}
                  selectedRows={assetRevokeList}
                  onClickRow={handleClickAssetRow}
                  toggleAllAssetRevoke={toggleAllAssetRevoke}
                  isSelectedAll={assetSelectResult.isSelectedAll}
                  isIndeterminate={assetSelectResult.isIndeterminate}
                />
              </div>
              {selectedContract ? (
                <RevokeApprovalModal
                  item={selectedContract}
                  visible={visibleRevokeModal}
                  onClose={() => {
                    setVisibleRevokeModal(false);
                  }}
                  onConfirm={(list) => {
                    patchContractRevokeMap(selectedContractKey, list);
                  }}
                  revokeList={contractRevokeMap[selectedContractKey]}
                />
              ) : null}
              {batchRevokeModal.node}
            </main>
            <div className="sticky-footer">
              <RevokeButton
                revokeSummary={revokeSummary}
                enableBatchRevoke={enableBatchRevoke}
                onRevoke={onRevoke}
              />
            </div>
          </>
        ) : (
          <div className="mt-[20px] rounded-[8px] bg-r-neutral-card1 pt-[145px] pb-[175px] flex flex-col items-center w-full">
            <RcIconEmpty />
            <div className="mt-[4px] text-r-neutral-foot text-[14px] leading-[20px]">
              {t('global.notSupportTesntnet')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalManagePage;
