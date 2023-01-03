import { message, Table } from 'antd';
import React from 'react';
import { ReactComponent as CopySVG } from 'ui/assets/icon-copy-gray.svg';
import ClipboardJS from 'clipboard';
import { AddToRabby } from './AddToRabby';
import { MAX_ACCOUNT_COUNT } from './AdvancedSettings';

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

  const fullData = React.useMemo(() => {
    if (data && data.length < MAX_ACCOUNT_COUNT) {
      const newData = [...data];
      for (let i = data.length; i < MAX_ACCOUNT_COUNT; i++) {
        newData.push({
          address: '',
          balance: '',
          index: i + 1,
          chains: [],
          firstTxTime: 0,
        });
      }
      return newData;
    }
  }, [data]);

  return (
    <Table<Account>
      dataSource={fullData}
      rowKey="index"
      className="AccountList"
      loading={loading}
      pagination={false}
    >
      <Table.Column<Account>
        title="Add to Rabby"
        key="add"
        render={(val, record) => record.address && <AddToRabby />}
        width={120}
        align="center"
        className="cell-add"
      />

      <Table.ColumnGroup
        title={<div className="column-group">Basic information</div>}
      >
        <Table.Column
          title="#"
          dataIndex="index"
          key="index"
          className="cell-index"
        />
        <Table.Column
          title="Addresses"
          dataIndex="address"
          key="address"
          render={(value: string) =>
            value ? (
              <div className="cell-address">
                <span>{value.toLowerCase()}</span>
                <CopySVG
                  onClick={() => copy(value.toLowerCase())}
                  className="copy-icon"
                />
              </div>
            ) : (
              <div>sketcon</div>
            )
          }
        />
        <Table.Column
          title="Notes"
          dataIndex="notes"
          key="notes"
          className="cell-note"
        />
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
          dataIndex="firstTxTime"
          key="firstTxTime"
        />
        <Table.Column title="Balance" dataIndex="balance" key="balance" />
      </Table.ColumnGroup>
    </Table>
  );
};
