import { CustomTestnetToken } from '@/background/service/customTestnet';
import IconUnknown from '@/ui/assets/token-default.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount, getUITypeName, openInTab } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { Image } from 'antd';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { TCell, TRow } from '../components/Table';
import { ellipsis } from '@/ui/utils/address';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconExternal } from 'ui/assets/tokenDetail/IconJump.svg';
import { ReactComponent as IconCopy } from 'ui/assets/tokenDetail/IconCopy.svg';
import { getAddressScanLink } from '@/utils';
import { copyAddress } from '@/ui/utils/clipboard';
export interface Props {
  item: CustomTestnetToken;
  hideChain?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const TokenItemAsset: React.FC<Props> = ({ item, hideChain }) => {
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
        {!hideChain && (
          <div className="text-r-neutral-foot text-13 font-normal leading-[14px] truncate">
            {chain?.name}
          </div>
        )}
      </div>
    </TCell>
  );
};

export const TokenChain: React.FC<Props> = ({ item }) => {
  const chain = findChain({
    id: item.chainId,
  });
  return (
    <TCell className="py-[13px] flex gap-10 flex-1 items-center">
      <div className="overflow-hidden gap-2">
        <div className="text-r-neutral-title1 text-14 font-normal leading-[14px] truncate">
          {chain?.name}({item.chainId})
        </div>
      </div>
    </TCell>
  );
};

export const TokenItemAddress: React.FC<Props> = ({ item }) => {
  const isNative = useMemo(() => {
    return (
      item.id.toLowerCase() ===
      findChain({
        id: item.chainId,
      })?.nativeTokenAddress.toLowerCase()
    );
  }, [item.id, item.chainId]);
  const handleClickLink = (token: CustomTestnetToken) => {
    const serverId = token.chainId;
    const chain = findChain({
      id: serverId,
    });
    if (!chain) return;
    const link = getAddressScanLink(chain.scanLink, token.id);
    const needClose = getUITypeName() !== 'notification';
    openInTab(link, needClose);
  };
  return (
    <TCell className="py-[13px] flex gap-10 flex-1 items-center">
      <div className="flex flex-row items-center gap-6">
        <span className=" text-rb-neutral-title-1 text-14">
          {isNative ? item.id : ellipsis(item.id)}
        </span>
        {!isNative && (
          <ThemeIcon
            src={RcIconExternal}
            className="w-14 cursor-pointer text-rb-neutral-secondary"
            onClick={() => {
              handleClickLink(item);
            }}
          />
        )}
        {!isNative && (
          <ThemeIcon
            src={IconCopy}
            className="w-14 cursor-pointer text-rb-neutral-secondary"
            onClick={() => {
              copyAddress(item.id);
            }}
          />
        )}
      </div>
    </TCell>
  );
};

export const TokenItemAmount: React.FC<Props & { className?: string }> = ({
  item,
  style,
  className,
}) => {
  return (
    <TCell
      style={style}
      className={clsx(
        'py-8 text-r-neutral-title-1 text-15 font-medium text-right w-[110px] ml-auto',
        className
      )}
    >
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
      <TokenItemAmount item={item} />
    </TRow>
  );
};
