import { Chain } from '@debank/common';
import { Form, Input } from 'antd';
import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';
import { ReactComponent as RcIconEdit } from '@/ui/assets/custom-testnet/icon-edit.svg';
import { ReactComponent as RcIconDelete } from '@/ui/assets/custom-testnet/icon-delete.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TestnetChain } from '@/background/service/customTestnet';
import { TestnetChainLogo } from '@/ui/component/TestnetChainLogo';

export const CustomTestnetItem = ({
  className,
  item,
  onEdit,
  onRemove,
  editable,
}: {
  className?: string;
  item: TestnetChain;
  onEdit?: (item: TestnetChain) => void;
  onRemove?: (item: TestnetChain) => void;
  editable?: boolean;
}) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-[12px] px-[15px] py-[10px]',
        'border-[1px] border-transparent rounded-[6px]',
        'hover:border-rabby-blue-default hover:bg-r-blue-light1',
        'group',
        className
      )}
    >
      <TestnetChainLogo name={item.name} className="flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[15px] leading-[18px] mb-[2px] font-medium text-r-neutral-title1">
          {item.name}
        </div>
        <div className="flex items-center gap-[16px]">
          <div className="text-[12px] leading-[14px] text-r-neutral-foot">
            Currency:{' '}
            <span className="text-r-neutral-body">
              {item.nativeTokenSymbol}
            </span>
          </div>
          <div className="text-[12px] leading-[14px] text-r-neutral-foot">
            ID: <span className="text-r-neutral-body">{item.id}</span>
          </div>
        </div>
      </div>
      {editable ? (
        <div className="group-hover:visible flex items-center gap-[12px] ml-auto invisible">
          <ThemeIcon
            src={RcIconEdit}
            className="cursor-pointer"
            onClick={() => {
              onEdit?.(item);
            }}
          ></ThemeIcon>
          <ThemeIcon
            src={RcIconDelete}
            className="cursor-pointer"
            onClick={() => {
              onRemove?.(item);
            }}
          ></ThemeIcon>
        </div>
      ) : null}
    </div>
  );
};
