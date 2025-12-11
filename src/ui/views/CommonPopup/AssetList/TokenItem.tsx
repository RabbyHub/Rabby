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
import { isLpToken } from '@/ui/utils/portfolio/lpToken';
import { LpTokenTag } from '../../DesktopProfile/components/TokensTabPane/components/LpTokenTag';

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
    <TCell className="py-8 flex gap-10 w-[160px] items-center">
      <div className="relative h-[32px]">
        <Image
          className="w-32 h-32 rounded-full"
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
            className="w-16 h-16 absolute right-[-2px] top-[-2px] rounded-full"
            src={chain?.logo || IconUnknown}
            alt={item.chain}
          />
        </TooltipWithMagnetArrow>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <span className="text-r-neutral-title-1 text-13 font-medium leading-[15px] truncate">
          {item._amountStr}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-r-neutral-foot text-12 leading-[14px] whitespace-nowrap overflow-ellipsis overflow-hidden flex-1">
            {item.symbol}
          </span>
          {isLpToken(item) && <LpTokenTag className="w-16 h-16" />}
        </div>
      </div>
    </TCell>
  );
};

const TokenItemPrice: React.FC<Props> = ({ item }) => {
  return (
    <TCell
      className={clsx(
        'py-8 text-r-neutral-title1 text-13 w-[90px]',
        'flex flex-col gap-2'
      )}
    >
      <div>${item._priceStr}</div>
      {isNil(item.price_24h_change) ? null : (
        <div
          className={clsx('font-normal text-12', {
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
    <TCell className="py-8 text-r-neutral-title-1 text-13 font-medium text-right w-[110px] truncate">
      {item._usdValueStr || '<$0.01'}
    </TCell>
  );
};

export const TokenItem: React.FC<Props> = ({ item, style, onClick }) => {
  return (
    <TRow
      onClick={onClick}
      style={{
        ...style,
        boxShadow: '0px 4px 16px 0px rgba(0, 0, 0, 0.04)',
      }}
      className={clsx(
        'cursor-pointer',
        'rounded-[8px] border border-transparent bg-r-neutral-card1 h-[60px] mt-8 pl-12 pr-16',
        'hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10'
      )}
    >
      <TokenItemAsset item={item} />
      <TokenItemPrice item={item} />
      <TokenItemUSDValue item={item} />
    </TRow>
  );
};
