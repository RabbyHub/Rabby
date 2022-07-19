import { Chain } from '@/background/service/openapi';
import { CHAINS_ENUM } from '@debank/common';
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
      ...rest
    }: SelectChainItemProps,
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <div
        className={clsx('select-chain-item', className)}
        ref={ref}
        {...rest}
        onClick={() => onChange?.(data.enum)}
      >
        <img src={data.logo} alt="" className="select-chain-item-icon" />
        <div className="select-chain-item-name">{data.name}</div>
        {stared ? (
          <img
            className="select-chain-item-star"
            src={IconStarFill}
            onClick={(e) => {
              e.stopPropagation();
              onStarChange?.(!stared);
            }}
          />
        ) : (
          <RcIconStar
            className="select-chain-item-star"
            onClick={(e) => {
              e.stopPropagation();
              onStarChange?.(!stared);
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
