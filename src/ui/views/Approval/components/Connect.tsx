import React from 'react';
import ChainSelector from 'ui/component/ChainSelector';
import { CHAINS_ENUM } from 'consts';

interface ConnectProps {
  params: any;
  onChainChange(chain: CHAINS_ENUM): void;
  defaultChain: CHAINS_ENUM;
}

const Connect = ({
  params: { icon, origin, name },
  onChainChange,
  defaultChain,
}: ConnectProps) => {
  return (
    <div className="approval-connect">
      <div className="font-medium text-20 text-center">
        Request for connection
      </div>
      <div className="connect-card">
        <div className="site-info">
          <img src={icon} className="site-info__icon" />
          <div className="site-info__text">
            <p className="text-15 font-medium">{origin}</p>
            <p className="text-14 text-gray-content">{name}</p>
          </div>
        </div>
        <div className="site-chain">
          <p className="mb-0 text-12 text-gray-content">
            On this site use chain
          </p>
          <ChainSelector value={defaultChain} onChange={onChainChange} />
        </div>
      </div>
    </div>
  );
};

export default Connect;
