import { CustomTestnetToken } from '@/background/service/customTestnet';
import IconUnknown from '@/ui/assets/token-default.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { Image } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { TCell, TRow } from '../components/Table';

export interface Props {
  item: CustomTestnetToken;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const TokenItemAsset: React.FC<Props> = ({ item }) => {
  const chain = findChain({
    id: item.chainId,
  });
  return (
    <TCell className="py-[13px] flex gap-10 flex-1 items-center">
      <div className="relative h-[32px]">
        <Image
          className="w-32 h-32 rounded-full"
          src={item.logo || IconUnknown}
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
            alt={chain?.name}
          />
        </TooltipWithMagnetArrow>
      </div>
      <div className="overflow-hidden gap-2">
        <div className="text-r-neutral-title-1 text-15 font-medium leading-[16px] mb-[1px]">
          {item.symbol}
        </div>
        <div className="text-r-neutral-foot text-13 font-normal leading-[14px] truncate">
          {chain?.name}
        </div>
      </div>
    </TCell>
  );
};

const TokenItemAmount: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title-1 text-15 font-medium text-right w-[110px] ml-auto">
      {formatAmount(Math.abs(item.amount))}
    </TCell>
  );
};

export const CustomTestnetTokenItem: React.FC<Props> = ({
  item,
  style,
  onClick,
}) => {
  return (
    <TRow
      onClick={onClick}
      style={style}
      className={clsx(
        'cursor-pointer',
        'rounded-[8px] border border-transparent bg-r-neutral-card1 h-[60px] mt-8 pl-12 pr-16',
        'hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10'
      )}
    >
      <TokenItemAsset item={item} />
      <TokenItemAmount item={item} />
    </TRow>
  );
};
