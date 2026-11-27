import { EcologyNavBar } from '@/ui/component/Ecology/EcologyNavBar';
import React, { useMemo } from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { EcoChains } from './constants';

export const Ecology = () => {
  const { chainId } = useParams<{ chainId: string }>();

  // Indexing EcoChainMap with an unlisted id gives undefined, or an
  // Object.prototype member for ids like `constructor`.
  const chain = useMemo(
    () => EcoChains.find((item) => String(item.id) === chainId),
    [chainId]
  );

  if (!chain) {
    return <Redirect to="/" />;
  }

  return (
    <div
      className="bg-r-neutral-bg2 h-full"
      style={{
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <EcologyNavBar
        className={`sticky top-0 w-full ${chain.navBarClassName}`}
        chainId={chain.id}
      />
      {chain.entry && <chain.entry />}
    </div>
  );
};
