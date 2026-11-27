import { Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { openIndexPage } from '@/background/webapi/tab';
import { RcIconJumpBoldCC } from '@/ui/assets/dashboard';
import {
  useCurrentAccount,
  useSceneAccountInfo,
} from '@/ui/hooks/backgroundState/useAccount';
import { PageHeader } from 'ui/component';
import {
  ApprovalAssetPopup,
  ApprovalContractPopup,
  ApprovalsBottomBar,
  EIP7702RevokeList,
  ListByAssets,
  ListByContracts,
} from './components';
import {
  EIP7702ApprovalsProvider,
  useEIP7702Approvals,
} from './hooks/useEIP7702Approvals';
import {
  ApprovalsPageContext,
  FILTER_TYPES,
  useApprovalsPage,
  useApprovalsPageOnTop,
} from './hooks/useManageApprovalsPage';
import { openInTab, useWallet } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';
import styles from './index.module.css';

const ManageApprovalsContent: React.FC = () => {
  const { t } = useTranslation();
  const { filterType, setFilterType } = useApprovalsPage();
  const { totalCount: eip7702TotalCount } = useEIP7702Approvals();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const scrollTabsToTop = React.useCallback(() => {
    const tabsContentHolder = containerRef.current?.querySelector<HTMLElement>(
      '.ant-tabs-content-holder'
    );
    if (tabsContentHolder) {
      tabsContentHolder.scrollTop = 0;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(styles.container, 'bg-r-neutral-bg-2')}
    >
      <PageHeader
        className="mx-[20px] mb-[3px]"
        isShowAccount
        rightSlot={
          <div className="absolute right-0 top-[50%] flex items-center gap-[16px] translate-y-[-50%]">
            <div
              className="relative cursor-pointer text-r-neutral-title1 hover:text-r-blue-default hit-slop-8"
              onClick={() => {
                openInTab('desktop.html#/desktop/manage-approvals');
              }}
            >
              <RcIconJumpBoldCC />
            </div>
          </div>
        }
      >
        {t('page.manageApprovals.title')}
      </PageHeader>

      <Tabs
        activeKey={filterType}
        onChange={(activeKey) => {
          scrollTabsToTop();
          setFilterType(
            activeKey as typeof FILTER_TYPES[keyof typeof FILTER_TYPES]
          );
        }}
        centered
        className="flex-1 min-h-0 overflow-auto"
      >
        <Tabs.TabPane
          tab={t('page.manageApprovals.tabs.contracts')}
          key={FILTER_TYPES.contract}
        >
          <ListByContracts />
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={t('page.manageApprovals.tabs.assets')}
          key={FILTER_TYPES.assets}
        >
          <ListByAssets />
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={`EIP-7702${eip7702TotalCount ? ` (${eip7702TotalCount})` : ''}`}
          key={FILTER_TYPES.EIP7702}
        >
          <EIP7702RevokeList />
        </Tabs.TabPane>
      </Tabs>

      <ApprovalsBottomBar />

      <ApprovalContractPopup />
      <ApprovalAssetPopup />
    </div>
  );
};

const ManageApprovalsPage: React.FC = () => {
  const { currentAccount } = useSceneAccountInfo();
  const approvalsPageCtx = useApprovalsPageOnTop({
    account: currentAccount,
    isTestnet: false,
    batchRevokePath: '/revoke-approvals/batch-revoke',
  });
  const { loadApprovals, filterType, searchKw } = approvalsPageCtx;

  React.useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  return (
    <ApprovalsPageContext.Provider value={approvalsPageCtx}>
      <EIP7702ApprovalsProvider
        account={currentAccount}
        isActive={filterType === FILTER_TYPES.EIP7702}
        prefetch
        searchKeyword={searchKw}
      >
        <ManageApprovalsContent />
      </EIP7702ApprovalsProvider>
    </ApprovalsPageContext.Provider>
  );
};

export const ManageApprovals = () => {
  const currentAccount = useCurrentAccount();

  return (
    <ManageApprovalsPage
      key={`${currentAccount?.type}-${currentAccount?.address}`}
    />
  );
};
