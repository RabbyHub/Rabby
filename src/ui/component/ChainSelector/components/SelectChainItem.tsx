import { Chain } from '@/background/service/openapi';
import { CHAINS_ENUM } from '@debank/common';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import React, { forwardRef, HTMLAttributes, useEffect } from 'react';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import ChainIcon from '../../ChainIcon';
import IconCheck from 'ui/assets/check-2.svg';
import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';

export type SelectChainItemProps = {
  stared?: boolean;
  data: Chain;
  value?: CHAINS_ENUM;
  onStarChange?: (value: boolean) => void;
  onChange?: (value: CHAINS_ENUM) => void;
  disabled?: boolean;
  disabledTips?: string;
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
    const { customRPC } = useRabbySelector((s) => ({
      ...s.customRPC,
    }));
    const dispatch = useRabbyDispatch();

    useEffect(() => {
      dispatch.customRPC.getAllRPC();
    }, []);

    return (
      <Tooltip
        trigger={['click', 'hover']}
        mouseEnterDelay={3}
        overlayClassName={clsx('rectangle left-[20px]')}
        placement="top"
        title={disabledTips}
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
          <div className="flex items-center">
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
            <div className="select-chain-item-name">{data.name}</div>
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
