import { Chain, TokenItem } from '@/background/service/openapi';
import React from 'react';
import { TokenRow } from './TokenRow';
import IconArrowUp from 'ui/assets/arrow-up.svg';

interface TokenGroupProps extends Partial<Chain> {
  style?: React.CSSProperties;
  tokens: TokenItem[];
  onTokenClick(token: TokenItem): void;
  onExpand?: (v: boolean) => void;
  isShowExpand: boolean;
  expand: boolean;
}

export const TokenGroup = ({
  style,
  name,
  tokens,
  onTokenClick,
  isShowExpand,
  expand = false,
  onExpand,
}: TokenGroupProps) => {
  return (
    <div className="group" style={style}>
      <div className="group-title">{name}</div>
      <div className="group-list">
        {tokens.map((item) => (
          <TokenRow
            token={item}
            key={item.id}
            onTokenClick={onTokenClick}
          ></TokenRow>
        ))}
        {isShowExpand && (
          <div className="filter" onClick={() => onExpand && onExpand(!expand)}>
            {!expand ? (
              <div className="flex justify-center items-center">
                {'Small deposits are hidden(<1% )'}
                <img src={IconArrowUp} className="rotate-180"></img>
              </div>
            ) : (
              <div className="flex justify-center items-center">
                {'Hide small deposits(<1% ）'}
                <img src={IconArrowUp}></img>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
