import React, { useMemo } from 'react';
import { CHAINS } from 'consts';
import { getTokenSymbol } from 'ui/utils/token';
import { TokenItem } from 'background/service/openapi';
import IconUnknown from 'ui/assets/token-default.svg';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';
import { TooltipWithMagnetArrow } from '../Tooltip/TooltipWithMagnetArrow';
import { TooltipV6 } from '../Tooltip/TooltipV6';
import { findChain } from '@/utils/chain';

// The class names stay as hooks for page styles that target them.
const CHAIN_SYMBOL =
  'chain-symbol rounded-[100%] w-14 h-14 absolute -right-2 -bottom-2';

const TokenWithChain = ({
  token,
  hideConer,
  width = '28px',
  height = '28px',
  chainSize = 14,
  noRound = false,
  hideChainIcon = false,
  isShowChainTooltip = false,
  className,
  chainClassName,
}: {
  token: TokenItem;
  width?: string;
  height?: string;
  hideConer?: boolean;
  noRound?: boolean;
  hideChainIcon?: boolean;
  isShowChainTooltip?: boolean;
  className?: string;
  chainSize?: string | number;
  chainClassName?: string;
}) => {
  const chainServerId = token.chain;
  const chain = findChain({
    serverId: chainServerId,
  });

  const chainStyle = useMemo(
    () => ({
      width: chainSize,
      height: chainSize,
    }),
    [chainSize]
  );
  return (
    <div
      className={cn(
        'token-with-chain relative',
        noRound && 'no-round',
        className
      )}
      style={{ width, height }}
    >
      <img
        className={clsx(
          'token-symbol',
          noRound ? 'no-round rounded-[4px]' : 'rounded-[100%]'
        )}
        src={token.logo_url || IconUnknown}
        alt={getTokenSymbol(token)}
        style={{ width, height, minWidth: width }}
      />
      {!hideChainIcon &&
        (!hideConer || chain?.id) &&
        (isShowChainTooltip ? (
          <TooltipV6
            title={chain?.name}
            overlayClassName={clsx('rectangle w-[max-content]', chainClassName)}
            placement="top"
          >
            <img
              className={cn(CHAIN_SYMBOL, chainClassName)}
              style={chainStyle}
              src={chain?.logo || IconUnknown}
            />
          </TooltipV6>
        ) : (
          <img
            className={cn(CHAIN_SYMBOL, chainClassName)}
            style={chainStyle}
            src={chain?.logo || IconUnknown}
          />
        ))}
    </div>
  );
};

export const IconWithChain = ({
  chainServerId,
  iconUrl,
  hideConer,
  width = '28px',
  height = '28px',
  noRound = false,
  hideChainIcon = false,
  chainSize,
  isShowChainTooltip = false,
  chainClassName,
}: {
  iconUrl?: string;
  chainServerId: string;
  width?: string;
  height?: string;
  hideConer?: boolean;
  noRound?: boolean;
  hideChainIcon?: boolean;
  isShowChainTooltip?: boolean;
  chainSize?: string;
  chainClassName?: string;
}) => {
  const chain = findChain({
    serverId: chainServerId,
  });
  const chainStyle = useMemo(
    () =>
      chainSize
        ? {
            width: chainSize,
            height: chainSize,
          }
        : {},
    [chainSize]
  );
  return (
    <div
      className={clsx('token-with-chain relative', noRound && 'no-round')}
      style={{ width, height }}
    >
      <img
        className={clsx(
          'token-symbol',
          noRound ? 'no-round rounded-[4px]' : 'rounded-[100%]'
        )}
        src={iconUrl || IconUnknown}
        alt={''}
        style={{ width, height, minWidth: width }}
      />
      {!hideChainIcon &&
        (!hideConer || chain?.id) &&
        (isShowChainTooltip ? (
          <TooltipWithMagnetArrow
            title={chain?.name}
            className="rectangle w-[max-content]"
          >
            <img
              className={cn(CHAIN_SYMBOL, chainClassName)}
              src={chain?.logo || IconUnknown}
              style={chainStyle}
            />
          </TooltipWithMagnetArrow>
        ) : (
          <img
            className={cn(CHAIN_SYMBOL, chainClassName)}
            src={chain?.logo || IconUnknown}
            style={chainStyle}
          />
        ))}
    </div>
  );
};

export default TokenWithChain;
