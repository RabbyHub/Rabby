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

export interface RevokeTableProps {
  onDone: () => void;
}

export const RevokeTable: React.FC<
  RevokeTableProps & {
    task: ReturnType<typeof useBatchRevokeTask>;
  }
> = ({ task }) => {
  const onStart = React.useCallback(() => {
    task.start();
  }, [task.start]);

  return (
    <div>
      <VirtualTable<AssetApprovalSpenderWithStatus>
        dataSource={task.list}
        markHoverRow={false}
        scroll={{ y: 456 }}
        overlayClassName="batch-revoke-table"
        getRowHeight={() => 52}
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

      <Button type="primary" onClick={onStart}>
        Sign and Start Revoke
      </Button>
    </div>
  );
};
