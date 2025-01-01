import React, { useMemo } from 'react';
import { CHAINS } from 'consts';
import { getTokenSymbol } from 'ui/utils/token';
import { TokenItem } from 'background/service/openapi';
import IconUnknown from 'ui/assets/token-default.svg';
import './style.less';
import clsx from 'clsx';
import { TooltipWithMagnetArrow } from '../Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';

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
      className={clsx('token-with-chain', noRound && 'no-round', className)}
      style={{ width, height }}
    >
      <img
        className={clsx('token-symbol', noRound && 'no-round')}
        src={token.logo_url || IconUnknown}
        alt={getTokenSymbol(token)}
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
              className="chain-symbol"
              style={chainStyle}
              src={chain?.logo || IconUnknown}
            />
          </TooltipWithMagnetArrow>
        ) : (
          <img
            className="chain-symbol"
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
  isShowChainTooltip = false,
}: {
  iconUrl?: string;
  chainServerId: string;
  width?: string;
  height?: string;
  hideConer?: boolean;
  noRound?: boolean;
  hideChainIcon?: boolean;
  isShowChainTooltip?: boolean;
}) => {
  const chain = findChain({
    serverId: chainServerId,
  });
  return (
    <div
      className={clsx('token-with-chain', noRound && 'no-round')}
      style={{ width, height }}
    >
      <img
        className={clsx('token-symbol', noRound && 'no-round')}
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
            <img className="chain-symbol" src={chain?.logo || IconUnknown} />
          </TooltipWithMagnetArrow>
        ) : (
          <img className="chain-symbol" src={chain?.logo || IconUnknown} />
        ))}
    </div>
  );
};

export default TokenWithChain;
