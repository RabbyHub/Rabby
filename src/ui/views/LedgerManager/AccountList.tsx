import { message, Table } from 'antd';
import React from 'react';
import { ReactComponent as CopySVG } from 'ui/assets/icon-copy-gray.svg';
import ClipboardJS from 'clipboard';

export interface Account {
  address: string;
  balance: string;
  index: number;
  chains: string[];
  firstTxTime: number;
}

export interface Props {
  loading: boolean;
  data?: Account[];
}

export const AccountList: React.FC<Props> = ({ loading, data }) => {
  const onHideInfo = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const copy = React.useCallback((value: string) => {
    const clipboard = new ClipboardJS('.copy-icon', {
      text: function () {
        return value;
      },
    });
    clipboard.on('success', () => {
      message.success('Copied');
      clipboard.destroy();
    });
  }, []);

  return (
    <Table
      dataSource={data}
      rowKey="index"
      className="AccountList"
      loading={loading}
      pagination={false}
    >
      <Table.Column title="Add to Rabby" dataIndex="add" key="add" />

      <Table.ColumnGroup
        title={<div className="column-group">Basic information</div>}
      >
        <Table.Column title="#" dataIndex="index" key="index" />
        <Table.Column
          title="Addresses"
          dataIndex="address"
          key="address"
          render={(value: string) => (
            <div className="cell-address">
              <span>{value.toLowerCase()}</span>
              <CopySVG
                onClick={() => copy(value.toLowerCase())}
                className="copy-icon"
              />
            </div>
          )}
        />
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
