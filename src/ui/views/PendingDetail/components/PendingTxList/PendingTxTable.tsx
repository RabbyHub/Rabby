import { useWallet } from '@/ui/utils';
import {
  NFTItem,
  PendingTxItem,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React from 'react';
import { Empty } from '../Empty';
import { TransactionAction } from './TransactionAction';
import { BalanceChange } from './BalanceChange';

export const PendingTxTable = ({
  list,
  tokenDict,
  hash,
}: {
  list: PendingTxItem[];
  tokenDict: Record<string, TokenItem | NFTItem>;
  hash?: string | null;
}) => {
  const wallet = useWallet();
  const columns: ColumnsType<PendingTxItem> = [
    {
      title: '#',
      render(value, record, index) {
        const idx = list.indexOf(record) + 1;

        return (
          <>
            {hash === record.id ? (
              <div className="is-current-tx">
                <div className="is-current-tx-tag">Current</div>
              </div>
            ) : null}
            {idx}
          </>
        );
      },
      width: 120,
    },
    {
      title: 'Gas Price',
      render(value, record, index) {
        return <div>{Number(record.gas_price || 0)} gwei</div>;
      },
      width: 240,
    },
    {
      title: 'Transaction Action',
      render(value, record, index) {
        return <TransactionAction data={record} />;
      },
      width: 304,
    },
    {
      title: 'Balance change',
      render(value, record, index) {
        return (
          <BalanceChange
            data={record.pre_exec_result?.balance_change}
            tokenDict={tokenDict}
          />
        );
      },
    },
  ];

  const isEmpty = !list?.length;
  if (isEmpty) {
    return <Empty />;
  }

  return (
    <Table
      columns={columns}
      dataSource={list || []}
      pagination={{
        simple: true,
        pageSize: 50,
        position: ['bottomCenter'],
      }}
      rowKey={(item) => item.id}
      className="simple-table"
    ></Table>
  );
};
