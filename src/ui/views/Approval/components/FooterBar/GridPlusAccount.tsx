import React from 'react';
import { CommonAccount } from './CommonAccount';
import { WALLET_BRAND_CONTENT } from '@/constant';
import clsx from 'clsx';
import { useGridPlusStatus } from '@/ui/component/ConnectStatus/useGridPlusStatus';

export const GridPlusAccount: React.FC = () => {
  const { status, onClickConnect, connectLoading } = useGridPlusStatus();

  const TipContent = () => {
    if (status === 'CONNECTED') {
      return <div className="text-gray-subTitle">GridPlus is connected</div>;
    }
    return (
      <div className="flex justify-between w-full">
        <div className="text-red-forbidden">GridPlus is not connected</div>
        <div
          onClick={onClickConnect}
          className={clsx('cursor-pointer', 'text-13 text-black', {
            'opacity-60': connectLoading,
            underline: !connectLoading,
          })}
        >
          {connectLoading ? 'Connecting...' : 'Connect'}
        </div>
      </div>
    );
  };

  return (
    <CommonAccount
      signal={status}
      icon={WALLET_BRAND_CONTENT.GRIDPLUS.icon}
      tip={<TipContent />}
    />
  );
};
