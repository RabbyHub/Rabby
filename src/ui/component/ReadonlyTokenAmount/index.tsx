import React from 'react';
import { TokenItem } from 'background/service/openapi';
import TokenWithChain from '../TokenWithChain';
import IconArrowDown from 'ui/assets/arrow-down-triangle.svg';
import './style.less';

interface ReadonlyTokenAmountProps {
  token: TokenItem;
  onClick(): void;
}

const ReadonlyTokenAmount = ({ token, onClick }: ReadonlyTokenAmountProps) => {
  return (
    <div className="readonly-token-amount" onClick={onClick}>
      <TokenWithChain token={token} />
      <span className="token-name-symbol">{token.symbol}</span>
      <img className="icon icon-arrow-down" src={IconArrowDown} />
    </div>
  );
};

export default ReadonlyTokenAmount;
