import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React from 'react';

export const PrePackInfo = () => {
  const columns: ColumnsType<any> = [
    {
      title: 'Pre-pack content',
      render(value, record, index) {
        return 'Pay Token';
      },
    },
    {
      title: 'Expectations',
      render(value, record, index) {
        return (
          <div>
            <img src="" alt="" />- 1.32 ETH
          </div>
        );
      },
    },
    {
      title: 'Pre-pack Results',
      render(value, record, index) {
        return (
          <div>
            <img src="" alt="" />- 1.32 ETH
          </div>
        );
      },
    },
    {
      title: 'Conclusions',
      render(value, record, index) {
        return <div>Same</div>;
      },
    },
  ];
  return (
    <div className="card">
      <div className="flex items-center">
        <div className="card-title">Pre-pack successfully</div>
        <div className="ml-auto">
          <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
            17063205
          </div>
          <div className="text-r-neutral-body text-[13px] leading-[16px] font-medium">
            25s ago
          </div>
        </div>
      </div>
      <div>
        <Table
          columns={columns}
          dataSource={[{}, {}]}
          pagination={false}
        ></Table>
      </div>
    </div>
  );
};
