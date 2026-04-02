import clsx from 'clsx';
import React, { useMemo } from 'react';

import { TokenAvatar } from './TokenAvatar';
import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import styled from 'styled-components';
import { Checkbox } from '@/ui/component';

export type ThresholdKey = '0.1' | '1' | '10' | '100';

export type ThresholdOption = {
  key: ThresholdKey;
  label: string;
  value: number;
};

export type LowValueToken = {
  id: string;
  symbol: string;
  amount: string;
  value: number;
  tone: string;
  chainTone: string;
};

type LowValueTokenSelectorProps = {
  thresholds: ThresholdOption[];
  activeThreshold: ThresholdKey;
  onThresholdChange: (key: ThresholdKey) => void;
  visibleTokens: LowValueToken[];
  selectedTokenIds: string[];
  selectionState: 'none' | 'partial' | 'all';
  selectedVisibleCount: number;
  totalValue: number;
  onToggleAllVisible: () => void;
  onToggleToken: (id: string) => void;
  formatUsd: (value: number) => string;
};

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

export const LowValueTokenSelector: React.FC<LowValueTokenSelectorProps> = ({
  thresholds,
  activeThreshold,
  onThresholdChange,
  visibleTokens,
  selectedTokenIds,
  selectionState,
  selectedVisibleCount,
  totalValue,
  onToggleAllVisible,
  onToggleToken,
  formatUsd,
}) => {
  const columns = useMemo<ColumnsType<LowValueToken>>(() => {
    return [
      {
        title: <Checkbox checked={false} width={'20px'} height={'20px'} />,
        dataIndex: 'select',
        width: 68,
        render: (_, record) => {
          const checked = selectedTokenIds.includes(record.id);
          return (
            <Checkbox
              width={'20px'}
              height={'20px'}
              checked={checked}
              onChange={() => onToggleToken(record.id)}
            />
          );
        },
      },
      {
        title: 'Token',
        width: 142,
        dataIndex: 'symbol',
        render: (text, record) => (
          <span className="min-w-0 flex items-center gap-[10px]">
            <TokenAvatar
              symbol={record.symbol}
              tone={record.tone}
              chainTone={record.chainTone}
            />
            {record.symbol}
          </span>
        ),
      },
      {
        title: 'Amount',
        width: 112,
        dataIndex: 'amount',
        align: 'right',
        render: (text) => <span className="text-r-neutral-title1">{text}</span>,
      },
      {
        title: 'Value',
        // width: 112,
        dataIndex: 'value',
        align: 'right',
        render: (value) => (
          <span className="text-r-neutral-title1">{formatUsd(value)}</span>
        ),
      },
    ];
  }, [selectedTokenIds]);
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
          const active = item.key === activeThreshold;
          return (
            <button
              type="button"
              key={item.key}
              onClick={() => onThresholdChange(item.key)}
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
          dataSource={visibleTokens}
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
                  {selectedVisibleCount}
                </span>
              </div>
              <div>
                Total value{' '}
                <span className="ml-[8px] font-medium text-r-neutral-title1">
                  {formatUsd(totalValue)}
                </span>
              </div>
            </div>
          )}
        ></Table>
      </div>
    </Container>
  );
};
