import React from 'react';
import { TCell, TRow } from './components/Table';
import { splitNumberByStep } from '@/ui/utils';
import { TokenItem as TokenItemType } from '@debank/rabby-api/dist/types';
import { CHAINS } from '@debank/common';
import BigNumber from 'bignumber.js';

export interface Props {
  item: TokenItemType;
}

const TokenItemAsset: React.FC<Props> = ({ item }) => {
  const chain = Object.values(CHAINS).find((c) => c.serverId === item.chain);

  return (
    <TCell className="py-8 flex gap-12">
      <div className="relative">
        <img
          className="w-24 h-24 rounded-full"
          src={item.logo_url}
          alt={item.symbol}
        />
        <img
          className="w-14 h-14 absolute right-[-2px] top-[-2px]"
          src={chain?.logo}
          alt={item.chain}
        />
      </div>
      <div className="flex flex-col gap-4">
        <span className="text-gray-title text-13 font-medium leading-[15px]">
          {item.amount.toFixed(4)}
        </span>
        <span className="text-gray-subTitle text-12 leading-[14px]">
          {item.symbol}
        </span>
      </div>
    </TCell>
  );
};

const TokenItemPrice: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-gray-subTitle text-12">
      ${splitNumberByStep(item.price.toFixed(2))}
    </TCell>
  );
};

const TokenItemUSDValue: React.FC<Props> = ({ item }) => {
  const usdValue = new BigNumber(item.amount).times(
    new BigNumber(item.price || 0)
  );
  return (
    <TCell className="py-8 text-gray-title text-13 font-medium text-right">
      {usdValue ? `$${splitNumberByStep(usdValue.toFixed(2))}` : '-'}
    </TCell>
  );
};

export const TokenItem: React.FC<Props> = ({ item }) => {
  return (
    <TRow>
      <TokenItemAsset item={item} />
      <TokenItemPrice item={item} />
      <TokenItemUSDValue item={item} />
    </TRow>
  );
};
