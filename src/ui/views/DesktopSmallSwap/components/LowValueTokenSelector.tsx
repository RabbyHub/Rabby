import clsx from 'clsx';
import React, { useMemo } from 'react';

import IconUnknown from '@/ui/assets/token-default.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount, formatUsdValue } from '@/ui/utils';
import { defaultTokenFilter } from '@/ui/utils/portfolio/lpToken';
import { getTokenSymbol } from '@/ui/utils/token';
import { Chain } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useInterval, useLocalStorageState, useMemoizedFn } from 'ahooks';
import { Image, Tooltip } from 'antd';
import { sortBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconStatusError } from 'ui/assets/small-swap/status-failed.svg';
import { ReactComponent as RcIconStatusIdle } from 'ui/assets/small-swap/status-idle.svg';
import { ReactComponent as RcIconStatusPending } from 'ui/assets/small-swap/status-pending.svg';
import { ReactComponent as RcIconStatusSuccess } from 'ui/assets/small-swap/status-success.svg';
import { ReactComponent as RcIconEmptyCC } from 'ui/assets/small-swap/empty-cc.svg';
import { PANEL_WIDTH, PANEL_WIDTH_DELTA } from '../constant';
import { BatchSwapTaskType } from '../hooks/useBatchSwapTask';
import { CheckboxV2 } from './Checkbox';

const Container = styled.section`
  .token-list {
    border: 0.5px solid var(--r-neutral-line, #d8e0ea);
    border-radius: 8px;
    overflow: hidden;

    display: flex;
    flex-direction: column;

    /* height: 525px; */
  }

  .token-list-header {
    height: 40px;
    background-color: var(--r-neutral-bg2, #f2f4f7);
    color: var(--r-neutral-body, #3e495e);
    font-size: 14px;
    font-weight: 500;
    line-height: 17px;
    padding-left: 16px;
    padding-right: 16px;
    flex-shrink: 0;

    .token-list-cell {
      height: 40px;
    }
  }

  .token-list-body {
    overflow-y: auto;
    min-height: 0;
    flex: 1;
  }

  .token-list-cell {
    height: 48px;
    padding: 0 16px;
    color: var(--r-neutral-title1, #192945);
    font-size: 14px;
    line-height: 17px;
  }

  .token-list-row {
    background: transparent;
    cursor: pointer;
    padding-left: 16px;
    padding-right: 16px;
  }

  .token-list-row.is-disabled {
    cursor: not-allowed;
  }

  .token-list-row:not(.is-disabled):hover {
    background: rgba(112, 132, 255, 0.04);
  }

  .token-list-row + .token-list-row {
    margin-top: 0;
  }

  .token-list-footer {
    background: transparent;
    flex-shrink: 0;
  }
`;

const COLUMN_WIDTH = {
  select: 52,
  token: 142,
  amount: 112,
  value: 112,
  status: 112,
} as const;

const thresholds = [
  { label: '<$0.1', value: 0.1 },
  { label: '<$1', value: 1 },
  { label: '<$10', value: 10 },
  { label: '<$100', value: 100 },
  { label: '<$1000', value: 1000 },
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
  const { t } = useTranslation();
  const showStatus = task?.status !== 'idle';

  const [
    currentThreshold = 10,
    setCurrentThreshold,
  ] = useLocalStorageState<number>('ui-desktop-low-value-token-threshold', {
    defaultValue: 10,
  });

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

  const [now, setNow] = React.useState(Date.now());
  useInterval(() => {
    setNow(Date.now());
  }, 1000);
  const displayTokenList = useMemo(() => {
    if (!task?.status || task?.status === 'idle') {
      return filteredTokenList;
    }
    return filteredTokenList.filter((item) => {
      const statusItem = task?.statusDict[item.id];
      if (
        statusItem?.status === 'success' &&
        statusItem.createdAt &&
        statusItem.createdAt < now - 1.5 * 1000
      ) {
        return false;
      }
      return true;
    });
  }, [filteredTokenList, task?.status, task?.statusDict, now]);

  const handleThresholdChange = useMemoizedFn((value: number) => {
    setCurrentThreshold(value);
    task?.clear();
  });

  const handleSelectedChange = useMemoizedFn((tokens: TokenItem[]) => {
    task?.init(tokens);
  });

  const handleTokenToggle = useMemoizedFn(
    (record: TokenItem, nextChecked: boolean) => {
      handleSelectedChange(
        !nextChecked
          ? task?.list?.filter((item) => item.id !== record.id) || []
          : filteredTokenList.filter((item) => {
              const result = [...(task?.list || []), record];
              return result.find((i) => i.id === item.id);
            })
      );
    }
  );

  const allSelected =
    !!task?.list?.length && task?.list?.length === filteredTokenList.length;
  const partiallySelected =
    !!task?.list?.length && task?.list?.length < filteredTokenList.length;

  const renderStatus = useMemoizedFn((record: TokenItem) => {
    const item = task?.statusDict[record.id];
    if (!item) {
      return null;
    }
    return (
      <div className="flex justify-end">
        <Tooltip
          overlayClassName="rectangle"
          title={item.message}
          placement="top"
        >
          {item.status === 'idle' && <ThemeIcon src={RcIconStatusIdle} />}
          {item.status === 'pending' && <ThemeIcon src={RcIconStatusPending} />}
          {item.status === 'success' && <ThemeIcon src={RcIconStatusSuccess} />}
          {item.status === 'failed' && <ThemeIcon src={RcIconStatusError} />}
        </Tooltip>
      </div>
    );
  });

  return (
    <Container
      className={clsx(
        'min-w-0 flex flex-col rounded-[16px] bg-r-neutral-card-1 px-[32px] py-[24px]'
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
      <div className="mb-[32px] text-[24px] leading-[29px] font-medium text-r-neutral-title1 flex-shrink-0">
        {t('page.desktopSmallSwap.selectLowValueTokens')}
      </div>

      <div className="flex items-center gap-[12px] mb-[16px] flex-shrink-0">
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
                  : 'border-rabby-neutral-line bg-rabby-neutral-card-1 text-rabby-neutral-foot hover:border-rabby-blue-default hover:text-rabby-blue-default',
                disabled ? 'cursor-not-allowed' : ''
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="token-list mt-[14px] flex-1 min-h-0">
        <div className="token-list-header flex items-center">
          <div
            className="token-list-cell token-list-cell flex items-center"
            style={{ width: COLUMN_WIDTH.select }}
          >
            <CheckboxV2
              checked={allSelected}
              indeterminate={partiallySelected}
              disabled={disabled}
              className="w-[20px] h-[20px]"
              onChange={(v) => {
                handleSelectedChange(v ? filteredTokenList : []);
              }}
            />
          </div>
          <div
            className="token-list-cell flex-1 min-w-0 flex items-center"
            style={{ width: COLUMN_WIDTH.token }}
          >
            {t('page.desktopSmallSwap.tokenColumn')}
          </div>
          <div
            className="token-list-cell flex items-center justify-end"
            style={{ width: COLUMN_WIDTH.amount }}
          >
            {t('page.desktopSmallSwap.amountColumn')}
          </div>
          <div
            className="token-list-cell flex items-center justify-end"
            style={{ width: COLUMN_WIDTH.value }}
          >
            {t('page.desktopSmallSwap.valueColumn')}
          </div>
          {showStatus ? (
            <div
              className="token-list-cell token-list-cell--last flex items-center justify-end"
              style={{ width: COLUMN_WIDTH.status }}
            >
              {t('page.desktopSmallSwap.statusColumn')}
            </div>
          ) : null}
        </div>

        {displayTokenList.length > 0 ? (
          <div className="token-list-body">
            {displayTokenList.map((record) => {
              const checked = !!task?.list?.find(
                (item) => item.id === record.id
              );
              return (
                <div
                  className={clsx('token-list-row flex items-center', {
                    'is-disabled': disabled,
                  })}
                  key={record.id}
                  role="checkbox"
                  aria-checked={checked}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : 0}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }
                    handleTokenToggle(record, !checked);
                  }}
                  onKeyDown={(evt) => {
                    if (disabled) {
                      return;
                    }
                    if (evt.key === 'Enter' || evt.key === ' ') {
                      evt.preventDefault();
                      handleTokenToggle(record, !checked);
                    }
                  }}
                >
                  <div
                    className="token-list-cell token-list-cell--first flex items-center"
                    style={{ width: COLUMN_WIDTH.select }}
                  >
                    <CheckboxV2
                      className="w-[20px] h-[20px]"
                      checked={checked}
                      disabled={disabled}
                      onChange={(v) => {
                        handleTokenToggle(record, v);
                      }}
                    />
                  </div>

                  <div
                    className="token-list-cell flex-1 min-w-0 flex items-center"
                    style={{ width: COLUMN_WIDTH.amount }}
                  >
                    <div className="flex items-center gap-[10px] min-w-0">
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
                  </div>

                  <div
                    className="token-list-cell flex items-center justify-end"
                    style={{ width: COLUMN_WIDTH.amount }}
                  >
                    <div className="text-r-neutral-title1">
                      {formatAmount(Math.abs(record.amount))}
                    </div>
                  </div>

                  <div
                    className="token-list-cell flex items-center justify-end"
                    style={{ width: COLUMN_WIDTH.value }}
                  >
                    <span className="text-r-neutral-title1">
                      {formatUsdValue(record.amount * record.price || 0)}
                    </span>
                  </div>

                  {showStatus ? (
                    <div
                      className="token-list-cell token-list-cell--last flex items-center justify-end"
                      style={{ width: COLUMN_WIDTH.status }}
                    >
                      {renderStatus(record)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <RcIconEmptyCC className="text-rb-neutral-bg-4" />
            <div className="text-[14px] leading-[17px] text-r-neutral-foot mt-[16px]">
              {t('page.desktopSmallSwap.noLowValueTokensFound')}
            </div>
          </div>
        )}

        {task?.status === 'idle' ? (
          <div
            className={clsx(
              'token-list-footer h-[52px] px-[18px]',
              'flex items-center justify-center gap-[64px]',
              'text-[13px] leading-[16px] text-r-neutral-foot',
              'border-t border-rabby-neutral-line'
            )}
          >
            <div>
              {t('page.desktopSmallSwap.selectedTokens')}{' '}
              <span className="ml-[8px] font-medium text-r-neutral-title1">
                {task?.list?.length || 0}
              </span>
            </div>
            <div>
              {t('page.desktopSmallSwap.totalValue')}{' '}
              <span className="ml-[8px] font-medium text-r-neutral-title1">
                {formatUsdValue(task?.expectReceive?.usd || 0)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Container>
  );
};
