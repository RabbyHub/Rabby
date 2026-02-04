import { useRabbySelector } from '@/ui/store';
import { DesktopPerps } from '.';
import React from 'react';
import { DesktopInnerDapp } from '../DesktopDappIframe';

export const DesktopPerpsEntry = ({ isActive }: { isActive?: boolean }) => {
  const perps = useRabbySelector((state) => state.innerDappFrame.perps);
  if (perps === 'hyperliquid') {
    return <DesktopPerps />;
  }
  return <DesktopInnerDapp type={'perps'} isActive={isActive} />;
};
