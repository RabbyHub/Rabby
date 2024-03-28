import React from 'react';
import { TCell, TRow } from './components/Table';
import { CHAINS_LIST } from '@debank/common';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import clsx from 'clsx';
import IconUnknown from '@/ui/assets/token-default.svg';
import { Image } from 'antd';
import { isNil } from 'lodash';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';

export interface Props {
  item: AbstractPortfolioToken;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const TokenItemAsset: React.FC<Props> = ({ item }) => {
  const chain = findChain({
    serverId: item.chain,
  });

  return (
    <TCell className="py-8 flex gap-12 w-[160px] items-center">
      <div className="relative">
        <Image
          className="w-24 h-24 rounded-full"
          src={item.logo_url || IconUnknown}
          alt={item.symbol}
          fallback={IconUnknown}
          preview={false}
        />
        <TooltipWithMagnetArrow
          title={chain?.name}
          className="rectangle w-[max-content]"
        >
          <img
            className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
            src={chain?.logo || IconUnknown}
            alt={item.chain}
          />
        </TooltipWithMagnetArrow>
      </div>
      <div className="flex flex-col gap-4 overflow-hidden">
        <span className="text-r-neutral-title-1 text-13 font-medium leading-[15px]">
          {item._amountStr}
        </span>
        <span className="text-r-neutral-body text-12 leading-[14px] whitespace-nowrap overflow-ellipsis overflow-hidden">
          {item.symbol}
        </span>
      </div>
    </TCell>
  );
};

const TokenItemPrice: React.FC<Props> = ({ item }) => {
  return (
    <TCell
      className={clsx(
        'py-8 text-r-neutral-body text-12 w-[90px]',
        'flex flex-col gap-4'
      )}
    >
      <div>${item._priceStr}</div>
      {isNil(item.price_24h_change) ? null : (
        <div
          className={clsx('font-normal', {
            'text-green': item.price_24h_change > 0,
            'text-red-forbidden': item.price_24h_change < 0,
          })}
        >
          {item.price_24h_change > 0 ? '+' : ''}
          {(item.price_24h_change * 100).toFixed(2)}%
        </div>
      )}
    </TCell>
  );
};

const TokenItemUSDValue: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title-1 text-13 font-medium text-right w-[110px]">
      {item._usdValueStr || '<$0.01'}
    </TCell>
  );
};

export const TokenItem: React.FC<Props> = ({ item, style, onClick }) => {
  return (
    <TRow
      onClick={onClick}
      style={style}
      className={clsx(
        'cursor-pointer',
        'rounded-[6px] border border-transparent -my-1 px-[19px] first-of-type:my-0',
        'hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10'
      )}
    >
      <TokenItemAsset item={item} />
      <TokenItemPrice item={item} />
      <TokenItemUSDValue item={item} />
    </TRow>
  );
};
