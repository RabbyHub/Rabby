import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { IsolateTag } from '../IsolateTag';
import { TCell, TRow } from '@/ui/views/CommonPopup/AssetList/components/Table';
import { Switch } from 'antd';
import { Tooltip } from 'antd';
import { ReactComponent as RcIconInfo } from '@/ui/assets/icon-info.svg';
import styled from 'styled-components';

const CollateralSwitch = styled(Switch)`
  &.ant-switch-checked {
    background-color: var(--rb-green-default, #2abb7f) !important;
  }
`;

export interface LendingRowData {
  id: string;
  asset: string;
  assetLogo?: string;
  type: 'supplied' | 'borrowed';
  apy: number;
  myAssets: number;
  isCollateral?: boolean;
  isIsolated?: boolean;
  onCollateralChange?: (checked: boolean) => void;
  onSupply?: () => void;
  onWithdraw?: () => void;
  onBorrow?: () => void;
  onRepay?: () => void;
  onSwap?: () => void;
}

export const LendingRow: React.FC<{
  data: LendingRowData;
}> = ({ data }) => {
  const { t } = useTranslation();
  const isSupplied = data.type === 'supplied';

  return (
    <TRow
      className={clsx('px-[16px] py-[12px] bg-rb-neutral-bg-3 rounded-[12px]')}
    >
      <TCell className="flex-1 min-w-0">
        <div className="flex items-center gap-[32px]">
          <div className="flex items-center gap-[8px] flex-shrink-0 min-w-[120px]">
            {data.assetLogo && (
              <img
                src={data.assetLogo}
                alt={data.asset}
                className="w-[24px] h-[24px] rounded-full flex-shrink-0"
              />
            )}
            <div className="flex items-center gap-[6px]">
              <span className="text-[14px] leading-[17px] font-medium text-r-neutral-title-1">
                {data.asset}
              </span>
              {data.isIsolated && <IsolateTag />}
            </div>
          </div>
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium flex-shrink-0 min-w-[80px]',
              isSupplied ? 'text-rb-green-default' : 'text-rb-red-default'
            )}
          >
            {isSupplied
              ? t('page.lending.type.supplied')
              : t('page.lending.type.borrowed')}
          </span>
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium flex-shrink-0 min-w-[80px]',
              isSupplied ? 'text-rb-green-default' : 'text-r-neutral-title-1'
            )}
          >
            {(data.apy * 100).toFixed(2)}%
          </span>
          <span className="text-[14px] leading-[17px] font-medium text-r-neutral-title-1 flex-shrink-0 min-w-[100px]">
            {formatUsdValue(data.myAssets, BigNumber.ROUND_DOWN)}
          </span>
        </div>
      </TCell>
      <TCell className="w-[80px] flex-shrink-0">
        <div className="flex items-center justify-center">
          {isSupplied ? (
            <CollateralSwitch
              checked={data.isCollateral}
              onChange={data.onCollateralChange}
              checkedChildren=""
              unCheckedChildren=""
            />
          ) : (
            <span className="text-[14px] leading-[17px] text-rb-neutral-foot">
              --
            </span>
          )}
        </div>
      </TCell>
      <TCell className="w-[360px] flex-shrink-0">
        <div className="flex items-center justify-end gap-[10px]">
          {isSupplied ? (
            <>
              <button
                onClick={data.onSupply}
                className={clsx(
                  'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                  'bg-rb-neutral-bg-3 text-r-neutral-title-1',
                  'hover:bg-rb-neutral-bg-4',
                  'flex items-center justify-center'
                )}
              >
                {t('page.lending.actions.supply')}
              </button>
              <button
                onClick={data.onWithdraw}
                className={clsx(
                  'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                  'bg-rb-brand-light-1 text-rb-brand-default',
                  'hover:bg-rb-brand-light-2',
                  'flex items-center justify-center'
                )}
              >
                {t('page.lending.actions.withdraw')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={data.onSwap}
                className={clsx(
                  'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                  'bg-rb-neutral-bg-3 text-r-neutral-title-1',
                  'hover:bg-rb-neutral-bg-4',
                  'flex items-center justify-center'
                )}
              >
                {t('page.lending.actions.swap')}
              </button>
              <button
                onClick={data.onBorrow}
                className={clsx(
                  'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                  'bg-rb-neutral-bg-3 text-r-neutral-title-1',
                  'hover:bg-rb-neutral-bg-4',
                  'flex items-center justify-center'
                )}
              >
                {t('page.lending.actions.borrow')}
              </button>
              <button
                onClick={data.onRepay}
                className={clsx(
                  'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
                  'bg-rb-neutral-bg-3 text-r-neutral-title-1',
                  'hover:bg-rb-neutral-bg-4',
                  'flex items-center justify-center'
                )}
              >
                {t('page.lending.actions.repay')}
              </button>
            </>
          )}
        </div>
      </TCell>
    </TRow>
  );
};
