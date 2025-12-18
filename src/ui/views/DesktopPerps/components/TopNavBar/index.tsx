import React from 'react';
import { DesktopNav } from '@/ui/component/DesktopNav';

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
      {/* Right side: Account Management */}
      <div className="flex items-center gap-[12px]">
        <div className="text-r-neutral-foot text-[14px]">
          Account Management Placeholder
        </div>
      </div>
    </div>
  );
};
