import React from 'react';
import { ApprovalsTabPane } from '../DesktopProfile/components/ApprovalsTabPane';
import IconRabby from 'ui/assets/rabby.svg';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMemoizedFn } from 'ahooks';
import { useWallet } from '@/ui/utils';
import { useRabbyDispatch } from '@/ui/store';

export const DesktopManageApprovals = () => {
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const handleAccountChange = useMemoizedFn((account) => {
    dispatch.account.changeAccountAsync(account);
  });
  return (
    <div className="h-full w-full overflow-auto bg-r-neutral-bg-2">
      <div className="mx-auto">
        <ApprovalsTabPane
          key={`${currentAccount?.address}-${currentAccount?.type}`}
          isDesktop={false}
          header={
            <header className="flex items-center justify-between w-full">
              <div className="flex items-center justify-between gap-[12px] pt-[32px] pb-[22px]">
                <img src={IconRabby} alt="Rabby" className="w-[33px]" />
                <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title1">
                  Approvals
                </div>
              </div>
              <DesktopAccountSelector
                className="bg-r-neutral-card-1 border-none"
                value={currentAccount}
                onChange={handleAccountChange}
              />
            </header>
          }
        />
      </div>
    </div>
  );
};
