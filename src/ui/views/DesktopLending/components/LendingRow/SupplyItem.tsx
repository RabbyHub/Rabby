import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { IsolateTag } from '../IsolateTag';
import { TCell, TRow } from '@/ui/views/CommonPopup/AssetList/components/Table';
import { Switch } from 'antd';
import styled from 'styled-components';
import { formatApy } from '../../utils/format';
import TokenIcon from '../SymbolIcon';
import { DisplayPoolReserveInfo } from '../../types';

const CollateralSwitch = styled(Switch)`
  &.ant-switch-checked {
    background-color: var(--rb-green-default, #2abb7f) !important;
  }
`;

export const SupplyItem: React.FC<{
  data: DisplayPoolReserveInfo;
  onSupply?: (data: DisplayPoolReserveInfo) => void;
  onWithdraw?: (data: DisplayPoolReserveInfo) => void;
  onToggleCollateral?: (data: DisplayPoolReserveInfo) => void;
}> = ({ data, onSupply, onWithdraw, onToggleCollateral }) => {
  const { t } = useTranslation();

  const apy = useMemo(() => {
    return formatApy(Number(data.reserve.supplyAPY));
  }, [data.reserve.supplyAPY]);

  const totalSuppliedUSD = useMemo(() => {
    return formatUsdValue(
      Number(data.underlyingBalanceUSD),
      BigNumber.ROUND_DOWN
    );
  }, [data.underlyingBalanceUSD]);

  const handleCollateralChange = useCallback(() => {
    onToggleCollateral?.(data);
  }, [data, onToggleCollateral]);
  const handleSupply = useCallback(() => {
    onSupply?.(data);
  }, [data, onSupply]);
  const handleWithdraw = useCallback(() => {
    onWithdraw?.(data);
  }, [data, onWithdraw]);

  return (
    <TRow
      className={clsx('px-[16px] py-[12px] bg-rb-neutral-bg-3 rounded-[12px]')}
    >
      <TCell className="flex-1 min-w-0">
        <div className="flex items-center gap-[32px]">
          <div className="flex items-center gap-[8px] flex-shrink-0 min-w-[140px]">
            {data.reserve.symbol && (
              <TokenIcon tokenSymbol={data.reserve.symbol} size={24} />
            )}
            <div className="flex items-center gap-[6px]">
              <span className="text-[14px] leading-[17px] font-medium text-r-neutral-title-1">
                {data.reserve.symbol}
              </span>
              {data.reserve.isIsolated && <IsolateTag />}
            </div>
          </div>
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium flex-shrink-0 min-w-[80px]',
              'text-rb-green-default'
            )}
          >
            {t('page.lending.type.supplied')}
          </span>
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium flex-shrink-0 min-w-[80px]',
              'text-rb-green-default'
            )}
          >
            {apy}
          </span>
          <span className="text-[14px] leading-[17px] font-medium text-r-neutral-title-1 flex-shrink-0 min-w-[100px]">
            {totalSuppliedUSD}
          </span>
        </div>
      </TCell>
      <TCell className="w-[130px] flex-shrink-0">
        <div className="flex items-center justify-start">
          <CollateralSwitch
            checked={data.usageAsCollateralEnabledOnUser}
            onChange={handleCollateralChange}
            checkedChildren=""
            unCheckedChildren=""
          />
        </div>
      </TCell>
      <TCell className="w-[360px] flex-shrink-0">
        <div className="flex items-center justify-end gap-[10px]">
          <button
            onClick={handleSupply}
            className={clsx(
              'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
              'bg-rb-neutral-bg-4 text-r-neutral-title-1',
              'flex items-center justify-center'
            )}
          >
            {t('page.lending.actions.supply')}
          </button>
          <button
            onClick={handleWithdraw}
            className={clsx(
              'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
              'bg-rb-brand-light-1 text-rb-brand-default',
              'hover:bg-rb-brand-light-2',
              'flex items-center justify-center'
            )}
          >
            {t('page.lending.actions.withdraw')}
          </button>
        </div>
      </TCell>
    </TRow>
  );
};
