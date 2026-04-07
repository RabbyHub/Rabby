import clsx from 'clsx';
import React, { useMemo, useState } from 'react';

import IconUnknown from '@/ui/assets/token-default.svg';
import { Checkbox } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount, formatUsdValue } from '@/ui/utils';
import { defaultTokenFilter } from '@/ui/utils/portfolio/lpToken';
import { DisplayedToken } from '@/ui/utils/portfolio/project';
import { getTokenSymbol } from '@/ui/utils/token';
import { Chain } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Image, Table, Tooltip } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { sortBy } from 'lodash';
import styled from 'styled-components';
import { PANEL_WIDTH, PANEL_WIDTH_DELTA } from '../constant';
import { BatchSwapTaskType } from '../hooks/useBatchSwapTask';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as RcIconStatusIdle } from 'ui/assets/small-swap/status-idle.svg';
import { ReactComponent as RcIconStatusPending } from 'ui/assets/small-swap/status-pending.svg';
import { ReactComponent as RcIconStatusSuccess } from 'ui/assets/small-swap/status-success.svg';
import { ReactComponent as RcIconStatusError } from 'ui/assets/small-swap/status-failed.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { CheckboxV2 } from './Checkbox';

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
    min-height: 435px;
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
  selectedTokenIds?: string[];
  onSelectedChange?(selectedIds: string[]): void;
  task?: BatchSwapTaskType;
  disabled?: boolean;
};
export const LowValueTokenSelector: React.FC<LowValueTokenSelectorProps> = ({
  chain,
  tokenList,
  task,
  disabled,
}) => {
  const [currentThreshold, setCurrentThreshold] = React.useState(10);

  const filteredTokenList = useMemo(() => {
    return sortBy(
      (tokenList || []).filter(
        (item) =>
          defaultTokenFilter(item) &&
          item.id !== chain?.nativeTokenAddress &&
          (item.amount * item.price || 0) < currentThreshold
      ),
      (item) => -(item.amount * item.price || 0)
    );
  }, [tokenList, currentThreshold]);

  const handleThresholdChange = useMemoizedFn((value: number) => {
    setCurrentThreshold(value);
    task?.clear();
  });

  const handleSelectedChange = useMemoizedFn((tokens: TokenItem[]) => {
    task?.init(sortBy(tokens, (item) => -(item.amount * item.price || 0)));
  });

  const columns = useMemo<ColumnsType<TokenItem>>(() => {
    return [
      {
        title: (
          <CheckboxV2
            checked={
              !!task?.list?.length &&
              task?.list?.length === filteredTokenList?.length
            }
            indeterminate={
              !!(
                task?.list?.length &&
                task?.list?.length < filteredTokenList?.length
              )
            }
            disabled={disabled}
            className="w-[20px] h-[20px]"
            onChange={(v) => {
              handleSelectedChange(v ? filteredTokenList : []);
            }}
          />
        ),
        dataIndex: 'select',
        width: 68,
        render: (_, record) => {
          const checked = !!task?.list?.find((item) => item.id === record.id);
          return (
            <CheckboxV2
              className="w-[20px] h-[20px]"
              checked={checked}
              disabled={disabled}
              onChange={(v) => {
                handleSelectedChange(
                  !v
                    ? task?.list?.filter((item) => item.id !== record.id) || []
                    : [...(task?.list || []), record]
                );
              }}
            />
          );
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
            {formatAmount(Math.abs(record.amount))}
          </div>
        ),
      },
      {
        title: 'Value',
        width: 112,
        align: 'right',
        render: (value, record) => (
          <span className="text-r-neutral-title1">
            {formatUsdValue(record.amount * record.price || 0)}
          </span>
        ),
      },
      task?.status !== 'idle'
        ? {
            title: 'Status',
            // width: 128,
            align: 'right',
            render: (value, record) => {
              const item = task?.statusDict[record.id];
              if (!item) {
                return null;
              }
              return (
                <div className="flex justify-end">
                  {item.status === 'idle' && (
                    <ThemeIcon src={RcIconStatusIdle} />
                  )}
                  {item.status === 'pending' && (
                    <ThemeIcon src={RcIconStatusPending} />
                  )}
                  {item.status === 'success' && (
                    <ThemeIcon src={RcIconStatusSuccess} />
                  )}
                  {item.status === 'failed' && (
                    <Tooltip
                      overlayClassName="rectangle"
                      title={item.failedReason}
                    >
                      <ThemeIcon src={RcIconStatusError} />
                    </Tooltip>
                  )}
                </div>
              );
            },
          }
        : null,
    ].filter(Boolean) as ColumnsType<TokenItem>;
  }, [chain, task, disabled, filteredTokenList, task?.list]);

  return (
    <Container
      className={clsx(
        'min-w-0 rounded-[16px] bg-r-neutral-card-1 px-[32px] py-[24px]'
      )}
      style={{
        boxShadow: '0 16px 40px rgba(25, 41, 69, 0.06)',
        transition: 'width 0.3s',
        width:
          task?.status === 'idle'
            ? PANEL_WIDTH
            : PANEL_WIDTH + PANEL_WIDTH_DELTA,
      }}
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
              disabled={disabled}
              onClick={() => handleThresholdChange(item.value)}
              className={clsx(
                'h-[40px] min-w-[80px] rounded-[8px] px-[14px] border text-[15px] leading-[18px] font-medium transition-colors',
                active
                  ? 'border-rabby-blue-default bg-rabby-blue-light1 text-rabby-blue-default'
                  : 'border-rabby-neutral-line bg-rabby-neutral-card-1 text-rabby-neutral-foot hover:bg-rabby-blue-light1 hover:border-rabby-blue-default hover:text-rabby-blue-default',
                disabled ? 'cursor-not-allowed' : ''
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
          dataSource={filteredTokenList}
          pagination={false}
          rowKey="id"
          bordered={false}
          scroll={{ y: 435 }}
          footer={() =>
            task?.status === 'idle' ? (
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
                    {task?.list?.length || 0}
                  </span>
                </div>
                <div>
                  Total value{' '}
                  <span className="ml-[8px] font-medium text-r-neutral-title1">
                    {formatUsdValue(task?.expectReceive?.usd || 0)}
                  </span>
                </div>
              </div>
            ) : null
          }
        ></Table>
      </div>
    </Container>
  );
};
