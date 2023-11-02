import { Table } from 'antd';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ColumnsType } from 'antd/lib/table';
import _ from 'lodash';
import React from 'react';

const list = _.range(2);

export const Loading = () => {
  const columns: ColumnsType<any> = [
    {
      title: 'Pre-pack content',
      width: 220,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 80, height: 16 }} />;
      },
    },

    {
      title: 'Expectations',
      width: 280,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 110, height: 16 }} />;
      },
    },

    {
      title: 'Pre-pack Results',
      width: 280,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 148, height: 16 }} />;
      },
    },
    {
      title: 'Conclusions',
      width: 220,
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
