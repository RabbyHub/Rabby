import { TestnetChain } from '@/background/service/customTestnet';
import { ReactComponent as RcIconDelete } from '@/ui/assets/custom-testnet/cc-delete.svg';
import { ReactComponent as RcIconEdit } from '@/ui/assets/custom-testnet/icon-edit.svg';
import { Spin } from '@/ui/component';
import { TestnetChainLogo } from '@/ui/component/TestnetChainLogo';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

export type TestnetChainWithRpcList = TestnetChain & { rpcList?: string[] };

export const CustomTestnetItem = ({
  className,
  item,
  onEdit,
  onRemove,
  onClick,
  editable,
  disabled,
  loading,
}: {
  className?: string;
  item: TestnetChainWithRpcList;
  onEdit?: (item: TestnetChainWithRpcList) => void;
  onRemove?: (item: TestnetChainWithRpcList) => void;
  onClick?: (item: TestnetChainWithRpcList) => void;
  editable?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex items-center gap-[12px] px-[15px] py-[10px]',
        'border-[1px] border-transparent rounded-[6px]',
        disabled
          ? 'opacity-50'
          : 'hover:border-rabby-blue-default hover:bg-r-blue-light1 cursor-pointer',
        'group',
        className
      )}
      onClick={() => {
        onClick?.(item);
      }}
    >
      {item.logo ? (
        <img
          src={item.logo}
          alt=""
          className="flex-shrink-0 w-[28px] h-[28px] rounded-full"
        />
      ) : (
        <TestnetChainLogo name={item.name} className="flex-shrink-0" />
      )}
      <div className="min-w-0">
        <div className="text-[15px] leading-[18px] mb-[2px] font-medium text-r-neutral-title1">
          {item.name}
        </div>
        <div className="flex items-center gap-[16px]">
          <div className="text-[12px] leading-[14px] text-r-neutral-foot">
            {t('page.customTestnet.currency')}:{' '}
            <span className="text-r-neutral-body">
              {item.nativeTokenSymbol}
            </span>
          </div>
          <div className="text-[12px] leading-[14px] text-r-neutral-foot">
            {t('page.customTestnet.id')}:{' '}
            <span className="text-r-neutral-body">{item.id}</span>
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
          <div className="cursor-pointer text-r-red-default">
            <RcIconDelete
              onClick={() => {
                onRemove?.(item);
              }}
            />
          </div>
        </div>
      ) : null}
      {loading ? (
        <div className="ml-auto">
          <Spin size="small" className="mr-auto" />
        </div>
      ) : null}
    </div>
  );
};
