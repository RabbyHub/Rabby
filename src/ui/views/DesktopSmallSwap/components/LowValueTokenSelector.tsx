import clsx from 'clsx';
import React, { useMemo } from 'react';

import { TokenAvatar } from './TokenAvatar';
import { Table, Image } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import styled from 'styled-components';
import { Checkbox } from '@/ui/component';
import { Chain } from '@debank/common';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import IconUnknown from '@/ui/assets/token-default.svg';
import { getTokenSymbol } from '@/ui/utils/token';
import { formatAmount, formatUsdValue } from '@/ui/utils';

const Container = styled.section`
  .ant-table {
    background-color: transparent;
  }
  .ant-table-container table > thead > tr:first-child th:first-child {
    border-top-left-radius: 8px;
    padding-left: 32px;
  }

  .ant-table-container table > thead > tr:first-child th:nth-last-child(2) {
    /* border-top-right-radius: 8px; */
    padding-right: 28px;
  }

  .ant-table-thead > tr > th {
    height: 40px;
    padding: 0 16px;
    border: none;
    &::before {
      display: none;
    }

    color: var(--r-neutral-body, #3e495e);
    font-size: 14px;
    font-weight: 500;
    line-height: 17px;

    background-color: var(--r-neutral-bg2, #f2f4f7);
    &.ant-table-cell-scrollbar {
      /* display: none; */
      background-color: var(--r-neutral-bg2, #f2f4f7);
      box-shadow: none;
    }
  }

  .ant-table-body {
    height: 435px;
  }
  .ant-table-tbody > tr > td {
    height: 48px;
    padding: 0 16px;
    border: none;

    color: var(--r-neutral-title1, #192945);
    font-size: 14px;
    line-height: 17px;
    background: transparent;

    &:first-child {
      padding-left: 32px;
    }
    &:last-child {
      padding-right: 28px;
    }

    &.ant-table-cell-row-hover {
      background-color: transparent;
    }
  }

  .ant-table-footer {
    padding: 0;
    background: transparent;
  }
`;

const thresholds = [
  { label: '<$0.1', value: 0.1 },
  { label: '<$1', value: 1 },
  { label: '<$10', value: 10 },
  { label: '<$100', value: 100 },
];
type LowValueTokenSelectorProps = {
  chain?: Chain | null;
  tokenList?: TokenItem[];
};
export const LowValueTokenSelector: React.FC<LowValueTokenSelectorProps> = ({
  chain,
  tokenList,
}) => {
  const [currentThreshold, setCurrentThreshold] = React.useState(10);
  console.log('LowValueTokenSelector render', { chain, tokenList });

  const columns = useMemo<ColumnsType<TokenItem>>(() => {
    return [
      {
        title: <Checkbox checked={false} width={'20px'} height={'20px'} />,
        dataIndex: 'select',
        width: 68,
        render: (_, record) => {
          // const checked = selectedTokenIds.includes(record.id);
          // return (
          //   <Checkbox
          //     width={'20px'}
          //     height={'20px'}
          //     checked={checked}
          //     onChange={() => onToggleToken(record.id)}
          //   />
          // );
          return <div></div>;
        },
      },
      {
        title: 'Token',
        width: 142,
        render: (text, record) => (
          <div className="flex items-center gap-[10px]">
            <div className="relative w-[24px] h-[24px] flex-shrink-0">
              <Image
                className="w-full h-full block rounded-full"
                src={record.logo_url || IconUnknown}
                alt={record.symbol}
                fallback={IconUnknown}
                preview={false}
              />
              <TooltipWithMagnetArrow
                title={chain?.name}
                className="rectangle w-[max-content]"
              >
                <img
                  className="w-[14px] h-[14px] absolute right-[-2px] bottom-[-2px] rounded-full"
                  src={chain?.logo || IconUnknown}
                  alt={record.chain}
                />
              </TooltipWithMagnetArrow>
            </div>
            <div className="text-[14px] leading-[17px] text-r-neutral-title1 truncate">
              {getTokenSymbol(record)}
            </div>
          </div>
        ),
      },
      {
        title: 'Amount',
        width: 112,
        dataIndex: 'amount',
        align: 'right',
        render: (text, record) => (
          <div className="text-r-neutral-title1">
            {formatAmount(record.amount)}
          </div>
        ),
      },
      {
        title: 'Value',
        // width: 112,
        align: 'right',
        render: (value, record) => (
          <span className="text-r-neutral-title1">
            {formatUsdValue(record.usd_value || 0)}
          </span>
        ),
      },
    ];
  }, [chain]);

  return (
    <Container
      className={clsx(
        'min-w-0 rounded-[16px] bg-r-neutral-card-1 px-[32px] py-[24px]',
        'w-[520px]'
      )}
      style={{ boxShadow: '0 16px 40px rgba(25, 41, 69, 0.06)' }}
    >
      <div className="mb-[32px] text-[24px] leading-[29px] font-medium text-r-neutral-title1">
        Select low-value tokens
      </div>

      <div className="flex items-center gap-[12px] mb-[16px]">
        {thresholds.map((item) => {
          const active = item.value === currentThreshold;
          return (
            <button
              type="button"
              key={item.value}
              onClick={() => setCurrentThreshold(item.value)}
              className={clsx(
                'h-[40px] min-w-[80px] rounded-[8px] px-[14px] border text-[15px] leading-[18px] font-medium transition-colors',
                active
                  ? 'border-rabby-blue-default bg-rabby-blue-light1 text-rabby-blue-default'
                  : 'border-rabby-neutral-line bg-rabby-neutral-card-1 text-rabby-neutral-foot hover:bg-rabby-blue-light1 hover:border-rabby-blue-default hover:text-rabby-blue-default'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-[14px] overflow-hidden rounded-[10px] border-[0.5px] border-rabby-neutral-line">
        <Table
          columns={columns}
          dataSource={tokenList}
          pagination={false}
          rowKey="id"
          bordered={false}
          scroll={{ y: 435 }}
          footer={() => (
            <div
              className={clsx(
                'h-[52px] px-[18px]',
                'flex items-center justify-center gap-[64px]',
                'text-[13px] leading-[16px] text-r-neutral-foot',
                'border-t border-rabby-neutral-line'
              )}
            >
              <div>
                Selected Tokens{' '}
                <span className="ml-[8px] font-medium text-r-neutral-title1">
                  {/* {selectedVisibleCount} */}
                </span>
              </div>
              <div>
                Total value{' '}
                <span className="ml-[8px] font-medium text-r-neutral-title1">
                  {/* {formatUsd(totalValue)} */}
                </span>
              </div>
            </div>
          )}
        ></Table>
      </div>
    </Container>
  );
};
