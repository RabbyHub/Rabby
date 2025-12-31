import React from 'react';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { AccountActions } from './components/AccountActions';

interface TopNavBarProps {
  balance?: number | null;
  changePercent?: string | null;
  isLoss?: boolean;
  isLoading?: boolean;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  balance,
  changePercent,
  isLoss,
  isLoading,
}) => {
  return (
    <div className="flex items-center justify-between px-[20px] py-[16px]">
      <DesktopNav
        balance={balance}
        changePercent={changePercent}
        isLoss={isLoss}
        isLoading={isLoading}
      />

      <AccountActions />
    </div>
  );
};
