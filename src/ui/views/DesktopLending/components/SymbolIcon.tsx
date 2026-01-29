import React, { useMemo } from 'react';
import { getTokenIcon } from '../utils/tokenIcon';

const TokenIcon = ({
  tokenSymbol,
  size,
}: {
  tokenSymbol: string;
  size: number;
}) => {
  const tokenLogoUrl = useMemo(() => getTokenIcon(tokenSymbol), [tokenSymbol]);

  return (
    <img
      className="rounded-full"
      src={tokenLogoUrl}
      alt={tokenSymbol}
      style={{ width: size, height: size }}
    />
  );
};

export default TokenIcon;
