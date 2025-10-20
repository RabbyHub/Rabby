import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ellipsis } from '@/ui/style/var-defs';
import { ellipsisAddress } from '@/ui/utils/address';
import clsx from 'clsx';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { BalanceView } from './BalanceView';

export const ProfileHeader = () => {
  const currentAccount = useCurrentAccount();
  const history = useHistory();

  if (!currentAccount) {
    return null;
  }

  return (
    <div className="px-[20px] py-[24px]">
      <div className="mb-[16px]">
        {ellipsisAddress(currentAccount?.address || '')}
      </div>

      <BalanceView currentAccount={currentAccount} />

      <div className="flex items-center gap-[12px]">
        <div
          className={clsx(
            'w-[112px] px-[16px] py-[12px] rounded-[8px] bg-r-neutral-card-2',
            'flex items-center gap-[8px] cursor-pointer',
            'text-r-neutral-title1 text-[13px] leading-[16px] font-medium'
          )}
          onClick={() => {
            history.replace(history.location.pathname + '?action=swap');
          }}
        >
          Swap
        </div>
        <div
          className={clsx(
            'w-[112px] px-[16px] py-[12px] rounded-[8px] bg-r-neutral-card-2',
            'flex items-center gap-[8px] cursor-pointer',
            'text-r-neutral-title1 text-[13px] leading-[16px] font-medium'
          )}
          onClick={() => {
            history.replace(history.location.pathname + '?action=send');
          }}
        >
          Send
        </div>
        <div
          className={clsx(
            'w-[112px] px-[16px] py-[12px] rounded-[8px] bg-r-neutral-card-2',
            'flex items-center gap-[8px] cursor-pointer',
            'text-r-neutral-title1 text-[13px] leading-[16px] font-medium'
          )}
          onClick={() => {
            history.replace(history.location.pathname + '?action=bridge');
          }}
        >
          Bridge
        </div>
        <div className="ml-auto">1 pending</div>
      </div>
    </div>
  );
};
