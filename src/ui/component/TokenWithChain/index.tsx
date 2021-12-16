import React from 'react';
import { CHAINS } from 'consts';
import { TokenItem } from 'background/service/openapi';
import IconUnknown from 'ui/assets/token-default.svg';
import './style.less';

const TokenWithChain = ({
  token,
  hideConer,
  width = '28px',
  height = '28px',
}: {
  token: TokenItem;
  width?: string;
  height?: string;
  hideConer?: boolean;
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
      {(!hideConer || chain?.id !== 1) && (
        <img className="chain-symbol" src={chain?.logo || IconUnknown} />
      )}
    </div>
  );
};

export default TokenWithChain;
