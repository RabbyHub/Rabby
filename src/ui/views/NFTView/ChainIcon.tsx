import { CHAINS } from '@/constant';
import clsx from 'clsx';
import React from 'react';
import IconUnknown from '@/ui/assets/token-default.svg';
import { keyBy } from 'lodash';

const chainDict = keyBy(CHAINS, 'serverId');

interface ChainIconProps {
  chain?: string;
  className?: string;
  style?: React.CSSProperties;
}
export const ChainIcon = ({ chain, className, style }: ChainIconProps) => {
  if (!chain) {
    return null;
  }
  const data = chainDict[chain];
  return (
    <img
      src={data?.logo || IconUnknown}
      className={clsx('w-[14px] h-[14px] rounded-full', className)}
      style={style}
    />
  );
};

export const getChainName = (chain: string) => {
  if (!chain) {
    return null;
  }
  const data = chainDict[chain];
  return data?.name || chain;
};
