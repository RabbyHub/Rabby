import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, isSameAddress } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { IsolateTag } from '../IsolateTag';
import { TCell, TRow } from '@/ui/views/CommonPopup/AssetList/components/Table';
import { Switch, Tooltip } from 'antd';
import styled from 'styled-components';
import { formatApy } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';
import { DisplayPoolReserveInfo } from '../../types';
import { getSupplyCapData } from '../../utils/supply';
import { useLendingSummary } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import wrapperToken from '../../config/wrapperToken';

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

  const { chainEnum } = useSelectedMarket();
  const { iUserSummary: userSummary, getTargetReserve } = useLendingSummary();

  const canBeEnabledAsCollateral = useMemo(() => {
    if (!data) {
      return false;
    }
    const { supplyCapReached } = getSupplyCapData(data);
    return userSummary
      ? !supplyCapReached &&
          data.reserve.reserveLiquidationThreshold !== '0' &&
          ((!data.reserve.isIsolated && !userSummary.isInIsolationMode) ||
            userSummary.isolatedReserve?.underlyingAsset ===
              data.underlyingAsset ||
            (data.reserve.isIsolated &&
              userSummary.totalCollateralMarketReferenceCurrency === '0'))
      : false;
  }, [data, userSummary]);

  const apy = useMemo(() => {
    return formatApy(Number(data.reserve.supplyAPY));
  }, [data.reserve.supplyAPY]);

  const isWrapperToken = useMemo(() => {
    return chainEnum
      ? isSameAddress(
          wrapperToken[chainEnum]?.address,
          data.reserve.underlyingAsset
        )
      : false;
  }, [data.reserve.underlyingAsset, chainEnum]);

  const totalSuppliedUSD = useMemo(() => {
    return formatUsdValue(
      Number(data.underlyingBalanceUSD),
      BigNumber.ROUND_DOWN
    );
  }, [data.underlyingBalanceUSD]);

  const handleCollateralChange = useCallback(() => {
    onToggleCollateral?.(data);
  }, [data, onToggleCollateral]);

  return (
    <TRow
      className={clsx(
        'px-[16px] py-[12px] bg-rb-neutral-bg-3 rounded-[12px] relative'
      )}
    >
      {isWrapperToken && (
        <div
          className="absolute left-[20px] top-[-6px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px]"
          style={{
            borderBottomColor: 'var(--rb-neutral-bg-3)',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />
      )}
      <TCell className="flex-1 min-w-0">
        <div className="flex items-center gap-[32px]">
          <div className="flex items-center gap-[8px] flex-shrink-0 min-w-[140px]">
            {data.reserve.symbol && (
              <SymbolIcon tokenSymbol={data.reserve.symbol} size={24} />
            )}
            <div className="flex items-center gap-[6px]">
              <span className="text-[14px] leading-[17px] font-semibold text-r-neutral-title-1">
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
          <span
            className={clsx(
              'text-[14px] leading-[17px] font-medium text-r-neutral-title-1',
              'flex-shrink-0 min-w-[100px]'
            )}
          >
            {totalSuppliedUSD}
          </span>
        </div>
      </TCell>
      <TCell className="w-[130px] flex-shrink-0">
        <div className="flex items-center justify-start">
          {canBeEnabledAsCollateral ? (
            <CollateralSwitch
              checked={data.usageAsCollateralEnabledOnUser}
              onChange={handleCollateralChange}
              checkedChildren=""
              unCheckedChildren=""
            />
          ) : (
            <Tooltip
              overlayClassName="rectangle"
              title={t('page.lending.supplyDetail.isolatedTips')}
            >
              <CollateralSwitch
                checked={data.usageAsCollateralEnabledOnUser}
                disabled
                checkedChildren=""
                unCheckedChildren=""
              />
            </Tooltip>
          )}
        </div>
      </TCell>
      <TCell className="w-[360px] flex-shrink-0">
        <div className="flex items-center justify-end gap-[10px]">
          <button
            onClick={() => onSupply?.(data)}
            className={clsx(
              'w-[120px] h-[36px] rounded-[6px] text-[14px] font-medium',
              'bg-rb-neutral-bg-4 text-r-neutral-title-1',
              'hover:bg-rb-brand-light-1',
              'flex items-center justify-center'
            )}
          >
            {t('page.lending.actions.supply')}
          </button>
          <button
            onClick={() => onWithdraw?.(data)}
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
