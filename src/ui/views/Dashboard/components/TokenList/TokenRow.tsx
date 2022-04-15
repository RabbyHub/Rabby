import { TokenItem } from '@/background/service/openapi';
import { TokenWithChain } from '@/ui/component';
import { splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import React, { useCallback } from 'react';

interface TokenRowProps {
  token: TokenItem;
  onTokenClick(token: TokenItem): void;
  style?: React.CSSProperties;
}
export const TokenRow = ({ token, onTokenClick, style }: TokenRowProps) => {
  const handleTokenClick = useCallback(() => {
    onTokenClick && onTokenClick(token);
  }, [onTokenClick, token]);
  return (
    <div
      className={clsx('token-item', 'cursor-pointer')}
      style={style}
      onClick={handleTokenClick}
    >
      <TokenWithChain token={token} hideConer width={'24px'} height={'24px'} />
      <div className="middle">
        <div className="token-amount">
          {splitNumberByStep(token.amount?.toFixed(4))}
        </div>
        <div className="token-name">{token.symbol}</div>
      </div>
      <div className="right">
        <div className="token-amount">
          ${splitNumberByStep((token.amount * token.price || 0)?.toFixed(2))}
        </div>
        <div className="token-name">
          @{splitNumberByStep((token.price || 0).toFixed(2))}
        </div>
      </div>
    </div>
  );
};
