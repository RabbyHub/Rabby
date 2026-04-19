import React from 'react';
import Tooltip from 'antd/es/tooltip';

import DefaultTokenIcon from '@/ui/assets/token-default.svg';
import { findChainByServerID } from '@/utils/chain';

type AssetAvatarProps = {
  logo?: string | null;
  size?: number;
  chain?: string | false;
  chainIconPosition?: 'tr' | 'br' | 'tl' | 'bl';
  chainSize?: number;
  style?: React.CSSProperties;
  logoStyle?: React.CSSProperties;
  innerChainStyle?: React.CSSProperties;
  className?: string;
};

const chainPositionStyleMap: Record<
  NonNullable<AssetAvatarProps['chainIconPosition']>,
  React.CSSProperties
> = {
  tl: { left: -2, top: -2 },
  bl: { left: -2, bottom: -2 },
  tr: { right: -2, top: -2 },
  br: { right: -2, bottom: -2 },
};

export const AssetAvatar: React.FC<AssetAvatarProps> = ({
  chain,
  chainIconPosition = 'br',
  logo,
  chainSize = 12,
  size = 28,
  style,
  logoStyle,
  innerChainStyle,
  className,
}) => {
  const [hasLogoError, setHasLogoError] = React.useState(false);
  const [hasChainLogoError, setHasChainLogoError] = React.useState(false);

  const chainInfo = chain ? findChainByServerID(chain) : null;
  const avatarSrc = !hasLogoError && logo ? logo : DefaultTokenIcon;
  const chainSrc = !hasChainLogoError ? chainInfo?.logo : '';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 100000,
          backgroundColor: 'var(--r-neutral-bg-1, #f2f4f7)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...logoStyle,
        }}
      >
        <img
          src={avatarSrc}
          alt=""
          style={{
            width: size,
            height: size,
            objectFit: 'cover',
          }}
          onError={() => {
            setHasLogoError(true);
          }}
        />
      </div>

      {chainSrc ? (
        <Tooltip title={chainInfo?.name} overlayClassName="rectangle">
          <img
            src={chainSrc}
            alt=""
            style={{
              position: 'absolute',
              width: chainSize,
              height: chainSize,
              borderRadius: chainSize / 2,
              backgroundColor: 'var(--r-neutral-bg-2, #ffffff)',
              ...chainPositionStyleMap[chainIconPosition],
              ...innerChainStyle,
            }}
            onError={() => {
              setHasChainLogoError(true);
            }}
          />
        </Tooltip>
      ) : null}
    </div>
  );
};
