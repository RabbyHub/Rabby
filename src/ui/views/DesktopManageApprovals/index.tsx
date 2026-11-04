import React from 'react';
import { ApprovalsTabPane } from '../DesktopProfile/components/ApprovalsTabPane';
import IconRabby from 'ui/assets/rabby.svg';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMemoizedFn, useMount } from 'ahooks';
import { useWallet } from '@/ui/utils';
import { useRabbyDispatch } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { reportWebPageView } from '@/ui/utils/ga-event';

export const DesktopManageApprovals = () => {
  const currentAccount = useCurrentAccount();
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const handleAccountChange = useMemoizedFn((account) => {
    dispatch.account.changeAccountAsync(account);
  });
  const location = useLocation();
  useMount(() => {
    reportWebPageView(location.pathname);
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
                  {t('page.manageApprovals.title')}
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
