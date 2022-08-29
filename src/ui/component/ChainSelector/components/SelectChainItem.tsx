import { Chain } from '@/background/service/openapi';
import { CHAINS_ENUM } from '@debank/common';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import React, { forwardRef, HTMLAttributes } from 'react';
import IconCheck from 'ui/assets/check-2.svg';
import IconStarFill from 'ui/assets/icon-star-fill.svg';
import { ReactComponent as RcIconStar } from 'ui/assets/icon-star.svg';

export type SelectChainItemProps = {
  stared?: boolean;
  data: Chain;
  value?: CHAINS_ENUM;
  onStarChange?: (value: boolean) => void;
  onChange?: (value: CHAINS_ENUM) => void;
  disabled?: boolean;
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
      ...rest
    }: SelectChainItemProps,
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <div
        className={clsx(
          'select-chain-item',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        ref={ref}
        {...rest}
        onClick={() => !disabled && onChange?.(data.enum)}
      >
        <Tooltip
          overlayClassName={clsx('rectangle')}
          placement="top"
          title={'Coming soon'}
          visible={disabled ? undefined : false}
        >
          <div className="flex items-center">
            <img src={data.logo} alt="" className="select-chain-item-icon" />
            <div className="select-chain-item-name">{data.name}</div>
          </div>
        </Tooltip>
        {stared ? (
          <img
            className="select-chain-item-star"
            src={IconStarFill}
            onClick={(e) => {
              e.stopPropagation();
              !disabled && onStarChange?.(!stared);
            }}
          />
        ) : (
          <RcIconStar
            className="select-chain-item-star"
            onClick={(e) => {
              e.stopPropagation();
              !disabled && onStarChange?.(!stared);
            }}
          ></RcIconStar>
        )}
        {value === data.enum ? (
          <img className="select-chain-item-checked" src={IconCheck}></img>
        ) : null}
      </div>
    );
  }
);
