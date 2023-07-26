import React, { useMemo, forwardRef, HTMLAttributes, useEffect } from 'react';
import { Chain } from '@/background/service/openapi';
import { CHAINS_ENUM } from '@debank/common';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import ChainIcon from '../../ChainIcon';
import IconCheck from 'ui/assets/check-2.svg';
import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';
import IconChainBalance from 'ui/assets/chain-select/chain-balance.svg';
import { formatUsdValue } from '@/ui/utils';

export type SelectChainItemProps = {
  stared?: boolean;
  data: Chain;
  value?: CHAINS_ENUM;
  onStarChange?: (value: boolean) => void;
  onChange?: (value: CHAINS_ENUM) => void;
  disabled?: boolean;
  disabledTips?: string | ((ctx: { chain: Chain }) => string);
  showRPCStatus?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, 'onChange'>;

export const SelectChainItem = forwardRef(
  (
    {
      data,
      className,
      stared,
      value,
      onStarChange,
      onChange,
      disabled = false,
      disabledTips = 'Coming soon',
      showRPCStatus = false,
      ...rest
    }: SelectChainItemProps,
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const { customRPC, cachedChainBalances } = useRabbySelector((s) => ({
      customRPC: s.customRPC.customRPC,
      cachedChainBalances: s.account.matteredChainBalances,
    }));
    const dispatch = useRabbyDispatch();

    useEffect(() => {
      dispatch.customRPC.getAllRPC();
    }, []);

    const finalDisabledTips = useMemo(() => {
      if (typeof disabledTips === 'function') {
        return disabledTips({ chain: data });
      }

      return disabledTips;
    }, [disabledTips]);

    return (
      <Tooltip
        trigger={['click', 'hover']}
        mouseEnterDelay={3}
        overlayClassName={clsx('rectangle left-[20px]')}
        placement="top"
        title={finalDisabledTips}
        visible={disabled ? undefined : false}
      >
        <div
          className={clsx(
            'select-chain-item',
            disabled && 'opacity-50',
            className
          )}
          ref={ref}
          {...rest}
          onClick={() => !disabled && onChange?.(data.enum)}
        >
          <div className="flex items-center flex-1">
            {showRPCStatus ? (
              <ChainIcon
                chain={data.enum}
                customRPC={
                  customRPC[data.enum]?.enable ? customRPC[data.enum].url : ''
                }
              />
            ) : (
              <img src={data.logo} alt="" className="select-chain-item-icon" />
            )}
            <div className="select-chain-item-info">
              <div className="select-chain-item-name">{data.name}</div>
              {!!cachedChainBalances[data.serverId]?.usd_value && (
                <div className="select-chain-item-balance">
                  <img
                    className="w-[14px] h-[14px] mt-2"
                    src={IconChainBalance}
                    alt={formatUsdValue(
                      cachedChainBalances[data.serverId]?.usd_value || 0
                    )}
                  />
                  <div className="ml-[6px] relative top-[2px]">
                    {formatUsdValue(
                      cachedChainBalances[data.serverId]?.usd_value || 0
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <img
            className={clsx(
              'select-chain-item-star',
              stared ? 'is-active' : ''
            )}
            src={stared ? IconPinnedFill : IconPinned}
            onClick={(e) => {
              e.stopPropagation();
              onStarChange?.(!stared);
            }}
          />
          {value === data.enum ? (
            <img className="select-chain-item-checked" src={IconCheck}></img>
          ) : null}
        </div>
      </Tooltip>
    );
  }
);
