import React from 'react';
import { AssetRow } from '../AssetRow';
import { VirtualTable } from '../Table';
import { SpenderRow } from '../SpenderRow';
import {
  AssetApprovalSpenderWithStatus,
  BatchRevokeTaskType,
  useBatchRevokeTask,
} from './useBatchRevokeTask';
import { StatusRow } from './StatusRow';
import { GasRow } from './GasRow';
import { HashRow } from './HashRow';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import { RevokeActionButton } from './RevokeActionButton';
import { RevokeModalHeader } from './RevokeModalHeader';
import { KEYRING_CLASS } from '@/constant';
import { RevokeActionLedgerButton } from './RevokeActionLedgerButton';

export interface RevokeTableProps {
  onDone: () => void;
  revokeList: ApprovalSpenderItemToBeRevoked[];
  dataSource: AssetApprovalSpender[];
  onClose: (needUpdate: boolean) => void;
  onTaskStatus: (status: BatchRevokeTaskType['status']) => void;
  accountType?: string;
}

const ROW_HEIGHT = 52;
const TABLE_MAX_HEIGHT = 416;
const TABLE_MIN_HEIGHT = 260;

export const RevokeTable: React.FC<RevokeTableProps> = ({
  revokeList,
  dataSource,
  onDone,
  onClose,
  onTaskStatus,
  accountType,
}) => {
  const task = useBatchRevokeTask();
  const { totalApprovals, revokedApprovals } = task;

  React.useEffect(() => {
    task.init(dataSource, revokeList);
  }, [dataSource, revokeList]);

  const scrollHeight = React.useMemo(() => {
    const height = task.list.length * ROW_HEIGHT;
    return Math.min(TABLE_MAX_HEIGHT, Math.max(TABLE_MIN_HEIGHT, height));
  }, [task.list]);

  const handleWindowBlur = React.useCallback(() => {
    if (task.status === 'active') {
      task.pause();
    }
  }, [task.status, task.pause]);

  React.useEffect(() => {
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [handleWindowBlur]);

  React.useEffect(() => {
    onTaskStatus(task.status);
  }, [task.status]);

  const defaultDocumentTitleRef = React.useRef<string>('');
  React.useEffect(() => {
    defaultDocumentTitleRef.current = document.title;
  }, []);

  React.useEffect(() => {
    if (task.status === 'paused') {
      document.title = 'Approvals - Paused';
    } else if (task.status === 'active') {
      document.title = `Approvals - Batch Revoke (${revokedApprovals}/${totalApprovals})`;
    } else {
      document.title = defaultDocumentTitleRef.current;
    }
  }, [task.status, totalApprovals, revokedApprovals]);

  return (
    <div className="my-8">
      <RevokeModalHeader
        totalApprovals={totalApprovals}
        revokedApprovals={revokedApprovals}
        onClose={onClose}
        task={task}
      />

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
            className: 'index-cell',
            render: (text, record, index) => (
              <span className="text-r-neutral-foot text-12 font-normal">
                {index + 1}
              </span>
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
            className: 'status-cell',
            render: (_, record) => (
              <StatusRow
                onStillRevoke={async () => {
                  task.addRevokeTask(record, 0, true);
                  task.continue();
                }}
                record={record}
                isPaused={task.status === 'paused'}
              />
            ),
          },
          {
            title: 'Hash',
            width: 140,
            render: (_, record) => <HashRow record={record} />,
          },
          {
            align: 'right',
            title: 'Gas Fee',
            width: 200,
            render: (_, record) => <GasRow record={record} />,
          },
        ]}
      />

      {accountType === KEYRING_CLASS.HARDWARE.LEDGER ? (
        <RevokeActionLedgerButton task={task} onDone={onDone} />
      ) : (
        <RevokeActionButton task={task} onDone={onDone} />
      )}
    </div>
  );
};
