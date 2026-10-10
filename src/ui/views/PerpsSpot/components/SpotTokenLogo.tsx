import React from 'react';
import { TokenImg } from '@/ui/views/Perps/components/TokenImg';
import { useSpotTokenLogo } from '../hooks/useSpotTokenLogo';

export const SpotTokenLogo: React.FC<{ baseName: string; size?: number }> = ({
  baseName,
  size = 32,
}) => {
  const logoUrl = useSpotTokenLogo(baseName);
  return <TokenImg logoUrl={logoUrl} size={size} />;
};
