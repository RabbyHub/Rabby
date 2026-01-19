import { ReactComponent as RcIconPending } from '@/ui/assets/perps/icon-spin.svg';
import React from 'react';

export const DepositPending = ({ pendingCount }: { pendingCount: number }) => {
  return (
    <div className="w-20 h-20 flex items-center justify-center text-r-orange-default relative">
      <span className="text-15 font-medium z-10">{pendingCount}</span>
      <RcIconPending className="absolute left-0 top-0 rounded-full animate-spin" />
    </div>
  );
};
