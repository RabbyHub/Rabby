import { Chain } from '@/background/service/openapi';
import { CHAINS_ENUM } from '@debank/common';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import React, { forwardRef, HTMLAttributes, useState } from 'react';
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
      ...rest
    }: SelectChainItemProps,
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const [hover, setHover] = useState(false);
    return (
      <div
        className={clsx(
          'select-chain-item',
          disabled && 'opacity-50',
          className
        )}
        ref={ref}
        {...rest}
        onClick={() => !disabled && onChange?.(data.enum)}
        onMouseEnter={(e) => {
          setHover(true);
          rest?.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHover(false);
          rest?.onMouseLeave?.(e);
        }}
      >
        <Tooltip
          overlayClassName={clsx('rectangle left-[20px]')}
          placement="top"
          title={disabledTips}
          visible={disabled ? hover : false}
        >
          <div className="flex items-center">
            <img src={data.logo} alt="" className="select-chain-item-icon" />
            <div className="select-chain-item-name">{data.name}</div>
          </div>
        </Tooltip>
        <img
          className={clsx('select-chain-item-star', stared ? 'is-active' : '')}
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
    );
  }
);
