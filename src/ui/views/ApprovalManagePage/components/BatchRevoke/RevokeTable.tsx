import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import React from 'react';
import { AssetApprovalSpender } from '@/utils/approval';
import { AssetRow } from '../AssetRow';
import { VirtualTable } from '../Table';
import { SpenderRow } from '../SpenderRow';
import { Button } from 'antd';
import {
  AssetApprovalSpenderWithStatus,
  useBatchRevokeTask,
} from './useBatchRevokeTask';
import SuccessSVG from '@/ui/assets/approval/success.svg';
import FailSVG from '@/ui/assets/approval/fail.svg';
import LoadingSVG from '@/ui/assets/address/loading.svg';

export interface RevokeTableProps {
  revokeList: ApprovalSpenderItemToBeRevoked[];
  dataSource: AssetApprovalSpender[];
  onDone: () => void;
}

export const RevokeTable: React.FC<RevokeTableProps> = ({
  dataSource,
  revokeList,
}) => {
  const task = useBatchRevokeTask();

  const onStart = React.useCallback(() => {
    task.start();
  }, [task.start]);

  React.useEffect(() => {
    task.init(dataSource, revokeList);
  }, [dataSource, revokeList]);

  return (
    <div>
      <VirtualTable<AssetApprovalSpenderWithStatus>
        dataSource={task.list}
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
            render: (_, record) => <div>{record.$status?.status || '-'}</div>,
          },
          {
            title: 'Hash',
            width: 140,
            render: (_, record) => <div>{record.$status?.txHash || '-'}</div>,
          },
          {
            title: 'Gas Fee',
            width: 200,
            render: (_, record) => <div>{record.$status?.gas || '-'}</div>,
          },
        ]}
      />
      <Button type="primary" onClick={onStart}>
        Sign and Start Revoke
      </Button>
    </div>
  );
};
