import React from 'react';
import { AssetRow } from '../AssetRow';
import { VirtualTable } from '../Table';
import { SpenderRow } from '../SpenderRow';
import { Button } from 'antd';
import {
  AssetApprovalSpenderWithStatus,
  useBatchRevokeTask,
} from './useBatchRevokeTask';
import { StatusRow } from './StatusRow';
import { GasRow } from './GasRow';
import { HashRow } from './HashRow';
import { useTranslation } from 'react-i18next';
import { ReactComponent as LoadingSVG } from '@/ui/assets/address/loading.svg';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import clsx from 'clsx';
import { RevokeActionButton } from './RevokeActionButton';

export interface RevokeTableProps {
  onDone: () => void;
  revokeList: ApprovalSpenderItemToBeRevoked[];
  dataSource: AssetApprovalSpender[];
}

const ROW_HEIGHT = 52;
const TABLE_MAX_HEIGHT = 416;
const TABLE_MIN_HEIGHT = 260;

export const RevokeTable: React.FC<RevokeTableProps> = ({
  revokeList,
  dataSource,
  onDone,
}) => {
  const task = useBatchRevokeTask();

  const { t } = useTranslation();

  const totalApprovals = React.useMemo(() => {
    return revokeList.length;
  }, [revokeList]);

  const revokedApprovals = React.useMemo(() => {
    return task.list.filter((item) => item.$status?.status === 'success')
      .length;
  }, [task.list]);

  React.useEffect(() => {
    task.init(dataSource, revokeList);
  }, [dataSource, revokeList]);

  const scrollHeight = React.useMemo(() => {
    // max height 416, min height 260
    const height = task.list.length * ROW_HEIGHT;
    return Math.min(TABLE_MAX_HEIGHT, Math.max(TABLE_MIN_HEIGHT, height));
  }, [task.list]);

  return (
    <div>
      <header className="space-y-12 text-center">
        <div className="space-x-8 flex justify-center items-center">
          {task.status === 'active' && (
            <LoadingSVG className="text-r-blue-default" />
          )}
          <span className="text-24 font-medium text-r-neutral-title-1">
            {t('page.approvals.revokeModal.batchRevoke')} ({revokedApprovals}/
            {totalApprovals})
          </span>
        </div>
        <div className="text-r-neutral-foot text-15 font-normal">
          {t('page.approvals.revokeModal.revoked')}{' '}
          {t('page.approvals.revokeModal.approvalCount', {
            count: revokedApprovals,
          })}
          丨{t('page.approvals.revokeModal.totalRevoked')}{' '}
          {t('page.approvals.revokeModal.approvalCount', {
            count: totalApprovals,
          })}
        </div>
      </header>

      <VirtualTable<AssetApprovalSpenderWithStatus>
        dataSource={task.list}
        markHoverRow={false}
        scroll={{ y: scrollHeight }}
        overlayClassName="batch-revoke-table mt-[20px]"
        getRowHeight={() => ROW_HEIGHT}
        columns={[
          {
            title: '#',
            key: 'index',
            render: (text, record, index) => (
              <span className="text-r-neutral-foot text-14">{index + 1}</span>
            ),
            width: 40,
          },
          {
            title: 'Revoke Asset',
            key: 'asset',
            render: (text, record) => (
              <AssetRow
                iconSize={16}
                hideChainIcon
                asset={record.$assetParent}
              />
            ),
            width: 140,
          },
          {
            title: 'Revoke From',
            key: 'approveSpender',
            dataIndex: 'key',
            render: (_, spender) => (
              <SpenderRow
                spender={spender}
                hasCopyIcon={false}
                hasExternalIcon={false}
                hasPermit2Badge={false}
                iconSize={16}
              />
            ),
            width: 280,
          },
          {
            title: 'Status',
            width: 100,
            render: (_, record) => <StatusRow record={record} />,
          },
          {
            title: 'Hash',
            width: 140,
            render: (_, record) => <HashRow record={record} />,
          },
          {
            title: 'Gas Fee',
            width: 200,
            render: (_, record) => <GasRow record={record} />,
          },
        ]}
      />

      <div className="mt-40 flex justify-center">
        <RevokeActionButton task={task} onDone={onDone} />
      </div>
    </div>
  );
};
