import { useRabbySelector } from '@/ui/store';
import React from 'react';
import { DesktopInnerDapp } from '../DesktopDappIframe';
import { DesktopLending } from '.';

export const DesktopLendingEntry = ({ isActive }: { isActive?: boolean }) => {
  const lending = useRabbySelector((state) => state.innerDappFrame.lending);
  if (lending === 'aave') {
    return <DesktopLending isActive={isActive} />;
  }
  return <DesktopInnerDapp type={'lending'} isActive={isActive} />;
};
