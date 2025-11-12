import React, { useCallback } from 'react';
import { TCell, TRow } from '@/ui/views/CommonPopup/AssetList/components/Table';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import IconUnknown from '@/ui/assets/token-default.svg';
import { Image } from 'antd';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { useHistory } from 'react-router-dom';
import { DesktopTokenLabel } from '../TransactionsTabPane/DesktopTokenLabel';
import clsx from 'clsx';
import styled from 'styled-components';
import { CustomTestnetToken } from '@/background/service/customTestnet';

export interface Props {
  item: AbstractPortfolioToken;
  style?: React.CSSProperties;
  isLast?: boolean;
  disableSwap?: boolean;
  disableSend?: boolean;
  onClick?: () => void;
}

export interface TestnetTokenItemProps {
  item: CustomTestnetToken;
}

const ActionBottom = ({
  onClick,
  text,
}: {
  onClick?: () => void;
  text?: string;
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        swap-action-btn
        px-10 h-[24px] leading-[24px] 
        text-r-blue-default text-12 font-medium rounded-[6px] 
        border-[0.5px] border-r-blue-default w-min cursor-pointer 
        hover:bg-r-blue-light1
      `}
    >
      {text}
    </div>
  );
};

export const TokenItemAsset: React.FC<Props> = ({
  item,
  disableSwap,
  disableSend,
}) => {
  const chain = findChain({
    serverId: item.chain,
  });
  const history = useHistory();
  const gotoSwap = useCallback(() => {
    history.replace(
      history.location.pathname +
        `?action=swap&chain=${item.chain}&payTokenId=${item._tokenId}`
    );
  }, [item._tokenId, item.chain]);

  const gotoSend = useCallback(() => {
    history.replace(
      history.location.pathname +
        `?action=send&token=${item.chain}:${item._tokenId}`
    );
  }, [item._tokenId, item.chain]);

  return (
    <TCell className="py-8 flex gap-10 flex-1 items-center overflow-hidden mr-4">
      <div className="relative h-[24px]">
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
            className="w-14 h-14 absolute right-[-4px] top-[-4px] rounded-full"
            src={chain?.logo || IconUnknown}
            alt={item.chain}
          />
        </TooltipWithMagnetArrow>
      </div>
      <div className="flex flex-1 flex-row items-center gap-[12px] overflow-hidden">
        <DesktopTokenLabel
          token={{ ...item, id: item._tokenId }}
          isNft={false}
          textClassName={`
            cursor-pointer no-underline
            text-r-neutral-title1 text-14 whitespace-nowrap overflow-ellipsis overflow-hidden
            hover:text-r-blue-default hover:underline 
          `}
        />
        {!disableSwap && <ActionBottom onClick={gotoSwap} text="Swap" />}
        {!disableSend && <ActionBottom onClick={gotoSend} text="Send" />}
      </div>
    </TCell>
  );
};

export const TestnetTokenItemAsset: React.FC<TestnetTokenItemProps> = ({
  item,
}) => {
  const chain = findChain({
    id: item.chainId,
  });
  const history = useHistory();
  const gotoSend = useCallback(() => {
    history.replace(
      history.location.pathname +
        `?action=send&token=${chain?.serverId}:${item.id}`
    );
  }, [chain?.serverId, item.id]);
  return (
    <TCell className="py-8 flex gap-10 flex-1 items-center overflow-hidden">
      <div className="relative h-[24px]">
        <Image
          className="w-24 h-24 rounded-full"
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
            className="w-14 h-14 absolute right-[-4px] top-[-4px] rounded-full"
            src={chain?.logo || IconUnknown}
            alt={chain?.name}
          />
        </TooltipWithMagnetArrow>
      </div>
      <div className="flex flex-1 flex-row items-center gap-[12px] overflow-hidden">
        <DesktopTokenLabel
          token={{
            ...item,
            id: item.id,
            chain: chain?.serverId || '',
            display_symbol: item.symbol,
            is_core: false,
            is_verified: true,
            is_wallet: false,
            is_scam: false,
            is_suspicious: false,
            logo_url: item.logo || '',
            name: item.symbol,
            optimized_symbol: item.symbol,
            price: 0,
            symbol: item.symbol,
            time_at: 0,
            price_24h_change: 0,
          }}
          isNft={false}
          textClassName={`
            cursor-pointer no-underline
            text-r-neutral-title1 text-14 whitespace-nowrap overflow-ellipsis overflow-hidden
            hover:text-r-blue-default hover:underline 
          `}
        />
        <ActionBottom onClick={gotoSend} text="Send" />
      </div>
    </TCell>
  );
};

const TokenItemAmount: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title1 text-14 flex-1 truncate">
      {item._amountStr}
    </TCell>
  );
};

const TokenItemPrice: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title1 text-14 flex-1 truncate">
      <div>${item._priceStr}</div>
    </TCell>
  );
};

const TokenItemUSDValue: React.FC<Props> = ({ item }) => {
  return (
    <TCell className="py-8 text-r-neutral-title1 text-14 flex-1 text-right truncate">
      {item._usdValueStr || '<$0.01'}
    </TCell>
  );
};

const TokenRowWrapper = styled(TRow)`
  border-bottom: 1px solid var(--rb-neutral-bg-4, #ebedf0);
  height: 60px;
  padding-left: 12px;
  padding-right: 16px;
  .swap-action-btn {
    display: none !important;
  }
  &:hover {
    background-color: var(--rb-neutral-bg-2, #f2f4f7);
    .swap-action-btn {
      display: block !important;
    }
  }
  &:last-child {
    border-bottom-color: transparent;
  }
`;

export const TokenItem: React.FC<Props> = ({ item, style, onClick }) => {
  return (
    <TokenRowWrapper onClick={onClick} style={style}>
      <TokenItemAsset item={item} />
      <TokenItemPrice item={item} />
      <TokenItemAmount item={item} />
      <TokenItemUSDValue item={item} />
    </TokenRowWrapper>
  );
};
