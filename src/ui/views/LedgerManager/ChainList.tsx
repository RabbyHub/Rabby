import React from 'react';
import { Account } from './AccountList';
interface Props {
  account: Account;
}
export const ChainList: React.FC<Props> = ({ account }) => {
  const displayChains = account.chains?.slice(0, 3);
  const restChainNum =
    (account.chains?.length ?? 0) - (displayChains?.length ?? 0);

  if (!displayChains?.length) {
    return null;
  }
  return (
    <div className="ChainList">
      {displayChains?.map((chain) => {
        return (
          <div className="chain-item" key={chain.id}>
            <img src={chain.logo_url} alt={chain.name} />
          </div>
        );
      })}
      {restChainNum > 0 && (
        <div className="chain-item">
          +{restChainNum > 99 ? '99' : restChainNum}
        </div>
      )}
    </div>
  );
};
