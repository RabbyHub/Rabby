import { message, Table } from 'antd';
import React from 'react';
import { ReactComponent as CopySVG } from 'ui/assets/icon-copy-gray.svg';
import ClipboardJS from 'clipboard';
import { AddToRabby } from './AddToRabby';
import { MAX_ACCOUNT_COUNT } from './AdvancedSettings';
import { AccountListSkeleton } from './AccountListSkeleton';
import { ChainWithBalance } from '@debank/rabby-api/dist/types';
import { splitNumberByStep, useWallet } from '@/ui/utils';
import dayjs from 'dayjs';
import { fetchAccountsInfo } from './utils';
import { ReactComponent as ArrowSVG } from 'ui/assets/ledger/arrow.svg';
import clsx from 'clsx';

export interface Account {
  address: string;
  balance?: number;
  index: number;
  chains?: ChainWithBalance[];
  firstTxTime?: number;
  aliasName?: string;
}

export interface Props {
  loading: boolean;
  data?: Account[];
}

export const AccountList: React.FC<Props> = ({ loading, data }) => {
  const wallet = useWallet();
  const [hiddenInfo, setHiddenInfo] = React.useState(true);
  const [list, setList] = React.useState<Account[]>([]);
  const infoRef = React.useRef<HTMLDivElement>(null);
  const [infoColumnWidth, setInfoColumnWidth] = React.useState(0);
  const [infoColumnTop, setInfoColumnTop] = React.useState(0);
  const toggleHiddenInfo = React.useCallback(
    (e: React.MouseEvent, val: boolean) => {
      e.preventDefault();
      setHiddenInfo(val);
    },
    []
  );

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

  React.useEffect(() => {
    setList(data ?? []);
  }, [data]);

  const currentIndex = React.useMemo(() => {
    if (list?.length) {
      return list.findIndex((item) => !item.address);
    }
    return -1;
  }, [list]);

  React.useEffect(() => {
    // watch infoRef resize
    const resizeObserver = new ResizeObserver(() => {
      setInfoColumnWidth(infoRef.current?.parentElement?.offsetWidth ?? 0);
      setInfoColumnTop(infoRef.current?.closest('thead')?.offsetHeight ?? 0);
    });
    resizeObserver.observe(infoRef.current ?? new Element());
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Table<Account>
      dataSource={list}
      rowKey="index"
      className="AccountList"
      loading={loading}
      pagination={false}
      summary={() =>
        list.length && hiddenInfo ? (
          <tr
            onClick={(e) => toggleHiddenInfo(e, !hiddenInfo)}
            className={clsx('info-mask', {
              'info-mask--center': list.length < 4,
            })}
            style={{
              top: `${infoColumnTop}px`,
              width: `${infoColumnWidth + 1}px`,
            }}
          >
            <td>
              <ArrowSVG className="icon" />
              <span>Click to get the information on-chain</span>
            </td>
          </tr>
        ) : null
      }
    >
      <Table.Column<Account>
        title="Add to Rabby"
        key="add"
        render={(val, record) =>
          record.address ? <AddToRabby /> : <AccountListSkeleton width={52} />
        }
        width={120}
        align="center"
        className="cell-add"
      />

      <Table.ColumnGroup
        title={<div className="column-group">Basic information</div>}
        className="column-group-wrap"
      >
        <Table.Column
          title="#"
          dataIndex="index"
          key="index"
          className="cell-index"
        />
        <Table.Column<Account>
          title="Addresses"
          dataIndex="address"
          key="address"
          render={(value: string, record, index) =>
            value ? (
              <div className="cell-address">
                <span>{value.toLowerCase()}</span>
                <CopySVG
                  onClick={() => copy(value.toLowerCase())}
                  className="copy-icon"
                />
              </div>
            ) : (
              <AccountListSkeleton height={28}>
                {index === currentIndex
                  ? `Loading ${index + 1}/${MAX_ACCOUNT_COUNT} addresses`
                  : ''}
              </AccountListSkeleton>
            )
          }
        />
        <Table.Column
          title="Notes"
          dataIndex="aliasName"
          key="aliasName"
          className="cell-note"
          render={(value) => <div>{value ? <span>{value}</span> : null}</div>}
        />
      </Table.ColumnGroup>

      <Table.ColumnGroup
        title={
          <div ref={infoRef} className="column-group">
            <a href="#" onClick={(e) => toggleHiddenInfo(e, !hiddenInfo)}>
              {hiddenInfo ? 'Get' : 'Hide'} on-chain information
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
          render={(value) =>
            !isNaN(value) && dayjs.unix(value).format('YYYY-MM-DD')
          }
        />
        <Table.Column<Account>
          title="Balance"
          dataIndex="balance"
          key="balance"
          render={(balance, record) =>
            record.chains?.length
              ? `$${splitNumberByStep(balance.toFixed(2))}`
              : null
          }
        />
      </Table.ColumnGroup>
    </Table>
  );
};
