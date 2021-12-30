import { CHAINS } from '@/constant';
import clsx from 'clsx';
import React from 'react';
import IconUnknown from 'ui/assets/token-default.svg';
import { keyBy } from 'lodash';

const chainDict = keyBy(CHAINS, 'serverId');

interface ChainIconProps {
  chain?: string;
  className?: string;
  style?: React.CSSProperties;
}
const ChainIcon = ({ chain, className, style }: ChainIconProps) => {
  if (!chain) {
    return null;
  }
  const data = chainDict[chain];
  return (
    <img
      src={data?.logo || IconUnknown}
      alt=""
      className={clsx('rabby-chain-icon', className)}
      style={style}
    />
  );
};

export default ChainIcon;
