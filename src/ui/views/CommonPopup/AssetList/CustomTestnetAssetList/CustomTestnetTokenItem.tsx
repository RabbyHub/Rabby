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
    <TCell className="py-[13px] flex gap-12 w-[160px] items-center">
      <div className="relative h-[24px]">
        <Image
          className="w-24 h-24 rounded-full"
          src={IconUnknown}
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
            alt={chain?.name}
          />
        </TooltipWithMagnetArrow>
      </div>
      <div className="overflow-hidden">
        <span className="text-r-neutral-title-1 text-13 font-medium leading-[15px]">
          {item.symbol}
        </span>
      </div>
    </TCell>
  );
};

const TokenItemAmount: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title-1 text-13 font-medium text-right w-[110px] ml-auto">
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
        'rounded-[6px] border border-transparent -my-1 px-[19px] first-of-type:my-0',
        'hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10'
      )}
    >
      <TokenItemAsset item={item} />
      <TokenItemAmount item={item} />
    </TRow>
  );
};
