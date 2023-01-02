import { Table } from 'antd';
import React from 'react';

export const AccountList: React.FC = () => {
  const onHideInfo = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <Table className="AccountList">
      <Table.Column title="Add to Rabby" dataIndex="add" key="add" />

      <Table.ColumnGroup
        title={<div className="column-group">Basic information</div>}
      >
        <Table.Column title="#" dataIndex="number" key="number" />
        <Table.Column title="Addresses" dataIndex="address" key="address" />
        <Table.Column title="Notes" dataIndex="notes" key="notes" />
      </Table.ColumnGroup>

      <Table.ColumnGroup
        title={
          <div className="column-group">
            <a href="#" onClick={onHideInfo}>
              Hide on-chain information
            </a>
          </div>
        }
      >
        <Table.Column
          title="Used chains"
          dataIndex="usedChains"
          key="usedChains"
        />
        <Table.Column
          title="First transaction time"
          dataIndex="firstTransactionTime"
          key="firstTransactionTime"
        />
        <Table.Column title="Balance" dataIndex="balance" key="balance" />
      </Table.ColumnGroup>
    </Table>
  );
};
