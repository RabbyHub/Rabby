import React from 'react';
import { TCell, TRow } from './components/Table';
import clsx from 'clsx';
import { SummaryToken } from '@rabby-wallet/rabby-api/dist/types';
import IconUnknown from '@/ui/assets/token-default.svg';
import HideAssets from '@/ui/assets/dashboard/hide-assets.svg';
import { Image } from 'antd';
import { ellipsisTokenSymbol } from '@/ui/utils/token';
import { isNil } from 'lodash';
import { formatAmount, formatUsdValue } from '@/ui/utils';
import { MINI_ASSET_ID, MINI_DEBT_ID } from '@/ui/utils/portfolio/assets';

export interface Props {
  item: SummaryToken & {
    _value: number;
    _percent: number;
  };
}

const TokenItemAsset: React.FC<Props> = ({ item }) => {
  const isSmallAssets = [MINI_ASSET_ID, MINI_DEBT_ID].includes(item.id);

  return (
    <TCell className="py-8 flex gap-12 w-[40%] items-center">
      <div className="relative flex-shrink-0 flex">
        <Image
          className="w-24 h-24 rounded-full"
          src={isSmallAssets ? HideAssets : item.logo_url || IconUnknown}
          alt={item.symbol}
          fallback={IconUnknown}
          preview={false}
        />
      </div>
      <div className="flex flex-col gap-4 overflow-hidden">
        <div
          className={clsx(
            'font-medium leading-[15px]',
            'flex gap-x-4 items-center',
            {
              'text-13 text-r-neutral-title-1': !isSmallAssets,
              'text-12 text-r-neutral-body': isSmallAssets,
            }
          )}
        >
          <span>
            {isSmallAssets ? item.symbol : ellipsisTokenSymbol(item.symbol)}
          </span>

          {item.amount < 0 ? (
            <div
              className={clsx(
                'text-12 text-[#F63D3D]',
                'border-[0.5px] border-[#F63D3D]',
                'rounded-[2px] px-4 py-1',
                'font-normal'
              )}
            >
              DEBT
            </div>
          ) : null}
        </div>
        {!isSmallAssets && (
          <div className="text-r-neutral-body text-12 leading-[14px] whitespace-nowrap overflow-ellipsis overflow-hidden">
            @{isNil(item.price) ? '-' : formatUsdValue(item.price || 0)}
          </div>
        )}
      </div>
    </TCell>
  );
};

const TokenItemPrice: React.FC<Props> = ({ item }) => {
  const isSmallAssets = [MINI_ASSET_ID, MINI_DEBT_ID].includes(item.id);

  return (
    <TCell className="py-8 text-r-neutral-body text-12 w-[30%]">
      <div className="flex flex-col gap-4 overflow-hidden">
        {!isSmallAssets && (
          <span className="text-r-neutral-title-1 text-13 font-medium leading-[15px]">
            {isNil(item.amount)
              ? '-'
              : formatAmount(Math.abs(item.amount || 0))}
          </span>
        )}
        <span
          className={clsx({
            'text-r-neutral-body text-12 leading-[14px] whitespace-nowrap overflow-ellipsis overflow-hidden': !isSmallAssets,
            'text-r-neutral-title-1 text-13 font-medium leading-[15px]': isSmallAssets,
          })}
        >
          {formatUsdValue(Math.abs(item._value))}
        </span>
      </div>
    </TCell>
  );
};

const TokenItemPercent: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="relative py-8 w-[30%]">
      <div
        className={clsx(
          'h-[32px] bg-opacity-20 rounded-[2px]',
          item._value > 0 ? 'bg-[#27C193]' : 'bg-[#EC5151]'
        )}
        style={{ width: `${item._percent}%` }}
      />
      <div
        className={clsx(
          'absolute inset-0 flex items-center pl-8',
          'text-12 text-r-neutral-body'
        )}
      >
        {item._percent.toFixed(2)}%
      </div>
    </TCell>
  );
};

export const SummaryItem: React.FC<Props> = ({ item }) => {
  console.log(item);
  return (
    <TRow
      className={clsx(
        'rounded-[6px] border border-transparent -my-1 px-[19px] first-of-type:my-0'
      )}
    >
      <TokenItemAsset item={item} />
      <TokenItemPrice item={item} />
      <TokenItemPercent item={item} />
    </TRow>
  );
};
