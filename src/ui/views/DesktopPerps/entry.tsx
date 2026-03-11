import { useRabbySelector } from '@/ui/store';
import { DesktopPerps } from '.';
import React from 'react';
import { DesktopInnerDapp } from '../DesktopDappIframe';

export const DesktopPerpsEntry = ({ isActive }: { isActive?: boolean }) => {
  return <DesktopPerps isActive={isActive} />;
};
