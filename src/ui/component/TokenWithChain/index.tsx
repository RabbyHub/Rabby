import React from 'react';
import { CHAINS } from 'consts';
import { TokenItem } from 'background/service/openapi';
import IconUnknown from 'ui/assets/token-default.svg';
import './style.less';

const TokenWithChain = ({
  token,
  width = '28px',
  height = '28px',
  displayChain = false,
}: {
  token: TokenItem;
  displayChain?: boolean;
  width?: string;
  height?: string;
}) => {
  const chainServerId = token.chain;
  const chain = Object.values(CHAINS).find(
    (item) => item.serverId === chainServerId
  );
  return (
    <div className="token-with-chain" style={{ width, height }}>
      <img
        className="token-symbol"
        src={token.logo_url || IconUnknown}
        alt={token.symbol}
        style={{ width, height }}
      />
      {displayChain && (
        <img className="chain-symbol" src={chain?.logo || IconUnknown} />
      )}
    </div>
  );
};

export default TokenWithChain;
