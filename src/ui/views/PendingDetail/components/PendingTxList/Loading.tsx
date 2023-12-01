import { Table } from 'antd';
import SkeletonAvatar from 'antd/lib/skeleton/Avatar';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ColumnsType } from 'antd/lib/table';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';

const list = _.range(10);

export const Loading = () => {
  const { t } = useTranslation();
  const columns: ColumnsType<any> = [
    {
      title: <div className="text-r-neutral-foot">#</div>,
      render(value, record, index) {
        return <div className="text-r-neutral-foot">{index + 1}</div>;
      },
      width: 80,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.gasPrice'),
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 68, height: 16 }} />;
      },
      width: 160,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.actionType'),
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 68, height: 16 }} />;
      },
      width: 260,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.interact'),
      render(value, record, index) {
        return (
          <div className="flex items-center gap-[12px]">
            <SkeletonAvatar active size={32} shape="circle" />
            <div className="flex flex-col gap-[4px]">
              <SkeletonInput active style={{ width: 88, height: 16 }} />
            </div>
          </div>
        );
      },
      width: 264,
    },
    {
      title: t('page.pendingDetail.PendingTxList.col.balanceChange'),
      render(value, record, index) {
        return (
          <div className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <SkeletonAvatar active size={16} shape="circle" />
              <SkeletonInput active style={{ width: 88, height: 16 }} />
            </div>
            <div className="flex items-center gap-[8px]">
              <SkeletonAvatar active size={16} shape="circle" />
              <SkeletonInput active style={{ width: 73, height: 16 }} />
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      className="simple-table"
      columns={columns}
      dataSource={list}
      pagination={false}
      rowKey={(record) => record}
    ></Table>
  );
};
