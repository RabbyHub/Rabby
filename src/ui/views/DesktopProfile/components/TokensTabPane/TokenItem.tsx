import React, { useCallback } from 'react';
import { TCell, TRow } from '@/ui/views/CommonPopup/AssetList/components/Table';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import IconUnknown from '@/ui/assets/token-default.svg';
import { Image } from 'antd';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';

export interface Props {
  item: AbstractPortfolioToken;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const SwapBottom = ({ onClick }: { onClick?: () => void }) => {
  return (
    <div
      onClick={onClick}
      className="px-10 h-[24px] leading-[24px] text-r-blue-default text-12 font-medium rounded-[4px] border-[0.5px] border-r-blue-default w-min cursor-pointer"
    >
      Swap
    </div>
  );
};

const TokenItemAsset: React.FC<Props> = ({ item }) => {
  const chain = findChain({
    serverId: item.chain,
  });
  const gotoTokenDetail = useCallback(() => {
    console.log('CUSTOM_LOGGER:=>: gotoTokenDetail', item._tokenId, item.chain);
  }, [item.id]);

  const gotoSwap = useCallback(() => {
    console.log('CUSTOM_LOGGER:=>: gotoSwap', item._tokenId, item.chain);
  }, [item.id]);

  return (
    <TCell className="py-8 flex gap-10 flex-1 items-center">
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
      <div className="flex flex-1 flex-row items-center gap-[12px] overflow-hidden">
        <span
          onClick={gotoTokenDetail}
          className={`
          text-r-neutral-title1 text-15 font-medium whitespace-nowrap overflow-ellipsis overflow-hidden
            cursor-pointer hover:text-r-blue-default hover:underline 
          `}
        >
          {item.symbol}
        </span>
        <SwapBottom onClick={gotoSwap} />
      </div>
    </TCell>
  );
};

const TokenItemAmount: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title1 text-15 font-medium flex-1 truncate">
      {item._amountStr}
    </TCell>
  );
};

const TokenItemPrice: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title1 text-15 font-medium flex-1 truncate">
      <div>${item._priceStr}</div>
    </TCell>
  );
};

const TokenItemUSDValue: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title1 text-15 font-medium flex-1 text-right truncate">
      {item._usdValueStr || '<$0.01'}
    </TCell>
  );
};

export const TokenItem: React.FC<Props> = ({ item, style, onClick }) => {
  return (
    <TRow
      onClick={onClick}
      style={style}
      className="rounded-[8px] border border-transparent h-[60px] mt-8 pl-12 pr-16"
    >
      <TokenItemAsset item={item} />
      <TokenItemPrice item={item} />
      <TokenItemAmount item={item} />
      <TokenItemUSDValue item={item} />
    </TRow>
  );
};
