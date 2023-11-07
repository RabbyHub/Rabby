import { Table } from 'antd';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ColumnsType } from 'antd/lib/table';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';

const list = _.range(6);

export const Loading = () => {
  const { t } = useTranslation();
  const columns: ColumnsType<any> = [
    {
      title: <div className="text-r-neutral-foot">#</div>,
      width: 112,
      render(value, record, index) {
        return <div className="text-r-neutral-foot">{index + 1}</div>;
      },
    },

    {
      title: t('page.pendingDetail.MempoolList.col.nodeName'),
      width: 294,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 110, height: 16 }} />;
      },
    },

    {
      title: t('page.pendingDetail.MempoolList.col.nodeOperator'),
      width: 348,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 148, height: 16 }} />;
      },
    },
    // {
    //   title: 'Node 24h packed percentage ',
    //   width: 220,
    //   render(value, record, index) {
    //     return <SkeletonInput active style={{ width: 68, height: 16 }} />;
    //   },
    // },

    {
      title: t('page.pendingDetail.MempoolList.col.txStatus'),
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 68, height: 16 }} />;
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
