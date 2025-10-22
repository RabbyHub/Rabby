import React, { memo } from 'react';

import iPlaceholder from 'ui/assets/token-default.svg';

import './index.css';
import { Chain, CHAINS_LIST } from '@debank/common';

export type LocalChain = Pick<
  Chain,
  'name' | 'id' | 'serverId' | 'scanLink' | 'hex' | 'nativeTokenSymbol' | 'logo'
> & {
  sortIdx?: number;
  is_support_history?: boolean;
};

export const CHAINS_DICT = CHAINS_LIST.reduce(
  (m, n, i) => ({
    ...m,
    [n.serverId]: {
      ...n,
      sortIdx: i,
    } as LocalChain,
  }),
  {} as Record<string, LocalChain>
);

function wrapUrlInImgOrDefault(
  url?: string,
  size?: number,
  style?: React.CSSProperties,
  placeHolder: string = iPlaceholder
) {
  return url ? (
    <img
      src={url}
      style={{ ...style, width: size || 20, height: size || 20 }}
      onError={(ev) => {
        (ev.target as HTMLImageElement).src = iPlaceholder;
      }}
    />
  ) : (
    <img
      src={placeHolder}
      style={{ ...style, width: size || 20, height: size || 20 }}
      alt={''}
    />
  );
}

// 堆叠小图标
export const TokensIcons = memo(
  (props: {
    icons: (string | undefined)[] | (string | undefined);
    nftIcons?: (string | undefined)[];
    isMobile?: boolean;
    width?: number;
    margin?: number;
    chain?: string;
  }) => {
    const {
      icons: _icons,
      isMobile,
      width: defaultWidth = 20,
      chain,
      nftIcons,
    } = props;
    const margin = props.margin ?? 6;
    const icons = Array.isArray(_icons) ? _icons : [_icons];
    const width =
      (defaultWidth ? defaultWidth / 2 : 10) + (isMobile ? 0 : margin / 2);
    const imgs = [
      ...(nftIcons ?? []).map((n) =>
        wrapUrlInImgOrDefault(n, defaultWidth, { borderRadius: 4 })
      ),
      ...icons.map((v) => wrapUrlInImgOrDefault(v, defaultWidth)),
    ];
    const containerWidth = 2 * width + (imgs.length - 1) * width;
    return (
      <div style={{ width: containerWidth }} className="tokenIcons">
        {imgs.map((v, i) => (
          <div style={{ left: i * -width + 'px' }} key={i}>
            {v}
          </div>
        ))}
        {chain && chain !== 'eth' && (
          <img
            style={{ right: margin / 2 + 2 }}
            src={CHAINS_DICT[chain]?.logo}
            alt=""
            className="chain"
          />
        )}
      </div>
    );
  }
);

export default TokensIcons;
