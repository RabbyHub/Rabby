import { CHAINS } from '@debank/common';
import React from 'react';
import { Account } from './AccountList';
import { findChain } from '@/utils/chain';

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
      {displayChains?.map(({ community_id }) => {
        const chain = findChain({
          id: community_id,
        });
        if (!chain) return null;
        return (
          <div className="chain-item" key={chain.id}>
            <img src={chain.logo} alt={chain.name} />
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
