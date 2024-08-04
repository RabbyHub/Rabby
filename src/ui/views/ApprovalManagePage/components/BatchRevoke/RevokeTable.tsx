import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import React from 'react';
import {
  SpenderInTokenApproval,
  SpenderInNFTApproval,
  AssetApprovalSpender,
} from '@/utils/approval';
import { AssetRow } from '../AssetRow';
import { VirtualTable } from '../Table';
import { SpenderRow } from '../SpenderRow';
import { Button } from 'antd';
import { useBatchRevokeTask } from './useBatchRevokeTask';

export interface RevokeTableProps {
  revokeList: ApprovalSpenderItemToBeRevoked[];
  dataSource: (SpenderInTokenApproval | SpenderInNFTApproval)[];
  onDone: () => void;
}

export const RevokeTable: React.FC<RevokeTableProps> = ({
  dataSource,
  revokeList,
}) => {
  const task = useBatchRevokeTask();

  const onStart = () => {
    console.log('Start Revoke');
    task.start(revokeList);
  };

  return (
    <div>
      <VirtualTable<AssetApprovalSpender>
        dataSource={dataSource}
        rowKey={(record) => `${record.id}:${record.$assetParent?.id}`}
        markHoverRow={false}
        scroll={{ y: 416, x: 900 }}
        overlayClassName="batch-revoke-table"
        columns={[
          {
            title: '#',
            key: 'index',
            render: (text, record, index) => index + 1,
            width: 40,
          },
          {
            title: 'Revoke Asset',
            key: 'asset',
            render: (text, record) => <AssetRow asset={record.$assetParent} />,
            width: 140,
          },
          {
            title: 'Revoke From',
            key: 'approveSpender',
            dataIndex: 'key',
            render: (_, spender) => <SpenderRow spender={spender} />,
            width: 280,
          },
          {
            title: 'Status',
            width: 100,
          },
          {
            title: 'Hash',
            width: 140,
          },
          {
            title: 'Gas Fee',
            width: 200,
          },
        ]}
      />
      <Button type="primary" onClick={onStart}>
        Sign and Start Revoke
      </Button>
    </div>
  );
};
