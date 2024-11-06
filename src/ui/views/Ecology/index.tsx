import React, { useMemo } from 'react';

import { DBK_CHAIN_ID, SONIC_TESTNET_CHAIN_ID } from '@/constant';
import { EcologyNavBar } from '@/ui/component/Ecology/EcologyNavBar';
import { useParams } from 'react-router-dom';
import { DbkChainEntry } from './dbk-chain/Entry';
import { SonicEntry } from './sonic/Entry';

const entries = {
  [DBK_CHAIN_ID]: DbkChainEntry,
  [SONIC_TESTNET_CHAIN_ID]: SonicEntry,
};

const navBarClasses = {
  [DBK_CHAIN_ID]: 'bg-rabby-neutral-bg1',
  [SONIC_TESTNET_CHAIN_ID]: 'bg-r-sonic-background',
};

export const Ecology = () => {
  const { chainId } = useParams<{ chainId: string }>();

  const Component = useMemo(() => {
    return entries[chainId];
  }, [chainId]);

  return (
    <div
      className="bg-r-neutral-bg2 h-full"
      style={{
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <EcologyNavBar
        className={`fixed top-0 w-full ${navBarClasses[chainId]}`}
        chainId={+chainId}
      />
      <div className="pt-[48px] h-full"> {Component && <Component />} </div>
    </div>
  );
};
