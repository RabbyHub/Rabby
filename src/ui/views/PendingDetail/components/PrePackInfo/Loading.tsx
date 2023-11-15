import { Table } from 'antd';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ColumnsType } from 'antd/lib/table';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';

const list = _.range(2);

export const Loading = () => {
  const { t } = useTranslation();
  const columns: ColumnsType<any> = [
    {
      title: t('page.pendingDetail.PrePackInfo.col.prePackContent'),
      width: 220,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 80, height: 16 }} />;
      },
    },

    {
      title: t('page.pendingDetail.PrePackInfo.col.expectations'),
      width: 280,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 110, height: 16 }} />;
      },
    },

    {
      title: t('page.pendingDetail.PrePackInfo.col.prePackResults'),
      width: 280,
      render(value, record, index) {
        return <SkeletonInput active style={{ width: 148, height: 16 }} />;
      },
    },
    {
      title: t('page.pendingDetail.PrePackInfo.col.difference'),
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
