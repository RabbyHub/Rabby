import React from 'react';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { AccountActions } from './components/AccountActions';

export const TopNavBar = () => {
  return (
    <div className="flex items-center justify-between px-[20px] py-[16px]">
      <DesktopNav showRightItems={false} />

      <AccountActions />
    </div>
  );
};
