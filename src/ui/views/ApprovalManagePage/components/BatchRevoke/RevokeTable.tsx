import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import React from 'react';
import {
  SpenderInTokenApproval,
  SpenderInNFTApproval,
  AssetApprovalSpender,
} from '@/utils/approval';
import { findIndexRevokeList } from '../../utils';
import { AssetRow } from '../AssetRow';
import { VirtualTable } from '../Table';
import { SpenderRow } from '../SpenderRow';
import { Button } from 'antd';

export interface RevokeTableProps {
  revokeList: ApprovalSpenderItemToBeRevoked[];
  dataSource: (SpenderInTokenApproval | SpenderInNFTApproval)[];
  onStart: () => void;
  onPause: () => void;
  onClose: () => void;
  onDone: () => void;
  onContinue: () => void;
}

export const RevokeTable: React.FC<RevokeTableProps> = ({
  revokeList,
  dataSource,
}) => {
  const filteredRevokeList = React.useMemo(
    () =>
      dataSource.filter((record) => {
        return (
          findIndexRevokeList(revokeList, {
            item: record.$assetContract!,
            spenderHost: record.$assetToken!,
            assetApprovalSpender: record,
          }) > -1
        );
      }),
    [revokeList, dataSource]
  );

  return (
    <div>
      <VirtualTable<AssetApprovalSpender>
        dataSource={filteredRevokeList}
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
      <Button>Done</Button>
    </div>
  );
};
