import { EcologyNavBar } from '@/ui/component/Ecology/EcologyNavBar';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EcoChainMap } from './constants';

export const Ecology = () => {
  const { chainId } = useParams<{ chainId: string }>();

  const chain = useMemo(() => EcoChainMap[chainId], [chainId]);

  return (
    <div
      className="bg-r-neutral-bg2 h-full"
      style={{
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <EcologyNavBar
        className={`fixed top-0 w-full ${chain.navBarClassName}`}
        chainId={+chainId}
      />
      <div className="pt-[48px] h-full"> {chain.entry && <chain.entry />} </div>
    </div>
  );
};
