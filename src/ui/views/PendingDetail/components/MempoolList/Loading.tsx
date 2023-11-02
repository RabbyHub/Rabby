import { Table } from 'antd';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ColumnsType } from 'antd/lib/table';
import _ from 'lodash';
import React from 'react';

const list = _.range(6);

export const Loading = () => {
  const columns: ColumnsType<any> = [
    {
      title: '#',
      width: 112,
      render(value, record, index) {
        return index + 1;
      },
    },

    {
      title: 'Node name',
      width: 220,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 110, height: 16 }} />;
      },
    },

    {
      title: 'Node operator',
      width: 220,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 148, height: 16 }} />;
      },
    },
    {
      title: 'Node 24h packed percentage ',
      width: 220,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 68, height: 16 }} />;
      },
    },

    {
      title: 'Transaction status',
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
