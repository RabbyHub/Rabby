import { CHAINS, CHAINS_ENUM, COBO_ARGUS_SUPPORT_CHAINS } from '@/constant';
import { ChainItem } from './ChainItem';
import React from 'react';

interface Props {
  onChecked: (chain: CHAINS_ENUM) => void;
  checked?: CHAINS_ENUM;
}

export const ChainList: React.FC<Props> = ({ onChecked, checked }) => {
  return (
    <div className="space-y-8">
      {COBO_ARGUS_SUPPORT_CHAINS.map((chainEnum) => {
        const chain = CHAINS[chainEnum];
        return (
          <ChainItem
            checked={checked === chainEnum}
            onChecked={() => onChecked(chainEnum)}
            key={chainEnum}
            chain={chain}
          />
        );
      })}
    </div>
  );
};
