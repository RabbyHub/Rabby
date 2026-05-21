import React from 'react';
import clsx from 'clsx';

import { findChainByServerID } from '@/utils/chain';

import type { StakingPool, StakingProtocol, StakingToken } from '../types';

const tokenLogoFallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.display = 'none';
};

const getTokenKey = (token: StakingToken, index: number) =>
  `${token.chain_id || token.chain || ''}-${token.id}-${index}`;

const getFallbackSymbol = (value?: string) =>
  (value || '?').slice(0, 1).toUpperCase();

export type StakingVisualSize = 'list' | 'detail' | 'mini';

export const TokenLogos = ({
  tokens,
  chainServerId,
  size = 'list',
}: {
  tokens: StakingToken[];
  chainServerId?: string;
  size?: StakingVisualSize;
}) => {
  const visibleTokens = tokens.slice(0, 2);
  const chain = chainServerId ? findChainByServerID(chainServerId) : undefined;
  const isPair = visibleTokens.length > 1;
  const config = {
    list: {
      height: 'h-[36px]',
      width: isPair ? 'w-[50px]' : 'w-[34px]',
      token: 'w-[32px] h-[32px]',
      firstLeft: 'left-0',
      secondLeft: 'left-[16px]',
      tokenTop: 'top-[2px]',
      chain: isPair ? 'w-[16px] h-[16px]' : 'w-[14px] h-[14px]',
      chainTop: isPair ? 'top-[20px]' : 'top-[21px]',
      chainLeft: isPair ? 'left-[34px]' : 'left-[19px]',
      fallbackText: 'text-[10px]',
    },
    detail: {
      height: 'h-[40px]',
      width: isPair ? 'w-[60px]' : 'w-[40px]',
      token: 'w-[40px] h-[40px]',
      firstLeft: 'left-0',
      secondLeft: 'left-[20px]',
      tokenTop: 'top-0',
      chain: 'w-[18px] h-[18px]',
      chainTop: 'top-[23px]',
      chainLeft: isPair ? 'left-[45px]' : 'left-[23px]',
      fallbackText: 'text-[12px]',
    },
    mini: {
      height: 'h-[20px]',
      width: 'w-[22px]',
      token: 'w-[20px] h-[20px]',
      firstLeft: 'left-0',
      secondLeft: 'left-[10px]',
      tokenTop: 'top-0',
      chain: 'w-[10px] h-[10px]',
      chainTop: 'top-[12px]',
      chainLeft: 'left-[12px]',
      fallbackText: 'text-[9px]',
    },
  }[size];

  return (
    <div
      className={clsx(
        'relative shrink-0',
        config.height,
        size === 'mini' ? config.width : isPair ? config.width : config.width
      )}
    >
      {visibleTokens.map((token, index) => (
        <div
          key={getTokenKey(token, index)}
          className={clsx(
            'absolute rounded-full bg-r-neutral-card2 overflow-hidden',
            'flex items-center justify-center',
            config.token,
            config.tokenTop,
            index === 0 ? config.firstLeft : config.secondLeft
          )}
        >
          {token.logo_url ? (
            <img
              src={token.logo_url}
              alt={token.symbol}
              className="block w-full h-full rounded-full object-cover"
              onError={tokenLogoFallback}
            />
          ) : (
            <span
              className={clsx(
                'font-medium leading-none text-r-neutral-foot',
                config.fallbackText
              )}
            >
              {getFallbackSymbol(token.symbol)}
            </span>
          )}
        </div>
      ))}
      {chain?.logo ? (
        <div
          className={clsx(
            'absolute rounded-full overflow-hidden bg-r-neutral-card1',
            'flex items-center justify-center',
            config.chain,
            config.chainTop,
            config.chainLeft
          )}
        >
          <img
            src={chain.logo}
            alt={chain.name}
            className="block w-full h-full rounded-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
};

export const ProtocolLogo = ({
  protocol,
  size = 20,
  className,
}: {
  protocol: StakingProtocol;
  size?: number;
  className?: string;
}) => {
  const style = { width: size, height: size };

  if (!protocol.logo_url) {
    return (
      <div
        className={clsx(
          'rounded-full bg-r-blue-light1 text-r-blue-default flex items-center justify-center text-[10px] font-medium',
          className
        )}
        style={style}
      >
        {getFallbackSymbol(protocol.name || protocol.id)}
      </div>
    );
  }

  return (
    <img
      src={protocol.logo_url}
      alt={protocol.name || protocol.id}
      className={clsx('block rounded-full object-cover', className)}
      style={style}
      onError={tokenLogoFallback}
    />
  );
};

export const ProtocolIconChip = ({
  protocol,
  className,
}: {
  protocol: StakingProtocol;
  className?: string;
}) => (
  <span className={clsx('staking-chip staking-chip-icon', className)}>
    <ProtocolLogo protocol={protocol} size={14} />
  </span>
);

export const PoolTypeTag = ({
  pool,
  size = 'list',
}: {
  pool: StakingPool;
  size?: 'list' | 'detail';
}) => {
  const className = clsx(
    size === 'detail' ? 'staking-chip staking-chip-detail' : 'staking-chip'
  );

  if (pool.type === 'erc4626') {
    return <span className={className}>Yield</span>;
  }

  return (
    <>
      <span className={className}>LP</span>
      <span className={className}>{pool.type === 'univ3' ? 'V3' : 'V2'}</span>
    </>
  );
};
