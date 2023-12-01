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
import { useTranslation } from 'react-i18next';
import { TransactionActionType } from './TransactionActionType';
import SkeletonInput from 'antd/lib/skeleton/Input';

export const PendingTxTable = ({
  list,
  tokenDict,
  hash,
}: {
  list: PendingTxItem[];
  tokenDict: Record<string, TokenItem | NFTItem>;
  hash?: string | null;
}) => {
  const { t } = useTranslation();

  const columns: ColumnsType<PendingTxItem> = [
    {
      title: <div className="text-r-neutral-foot">#</div>,
      render(value, record, index) {
        const idx = list.indexOf(record) + 1;

        return (
          <>
            {hash === record.id ? (
              <div className="is-current-tx">
                <div className="is-current-tx-tag">Current</div>
              </div>
            ) : null}
            <div className="text-r-neutral-foot">{idx}</div>
          </>
        );
      },
      width: 80,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.gasPrice'),
      render(value, record, index) {
        return (
          <div className="font-medium text-r-neutral-title-1">
            {Number(record.gas_price || 0)} gwei
          </div>
        );
      },
      width: 160,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.actionType'),
      render(value, record, index) {
        return <TransactionActionType data={record} />;
      },
      width: 260,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.interact'),
      render(value, record, index) {
        return <TransactionAction data={record} />;
      },
      width: 264,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.balanceChange'),
      render(value, record, index) {
        if (!record?.pre_exec_result?.pre_exec?.success) {
          return <SkeletonInput active style={{ width: 109, height: 21 }} />;
        }
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
      className="simple-table pending-tx-table"
    ></Table>
  );
};
