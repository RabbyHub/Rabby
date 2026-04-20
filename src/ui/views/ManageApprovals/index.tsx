import { Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { openIndexPage } from '@/background/webapi/tab';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
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

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .ant-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;

    .ant-tabs-nav {
      margin-bottom: 0;
      &::before {
        border-bottom: 0.5px solid var(--r-neutral-line, #e0e5ec);
      }

      .ant-tabs-nav-list {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-around;
      }
    }

    .ant-tabs-content-holder {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }

    .ant-tabs-tabpane {
      padding-top: 16px;
      padding-left: 20px;
      padding-right: 20px;
    }

    .ant-tabs-tab {
      color: var(--r-neutral-body, #3e495e);
      font-size: 13px;
      font-weight: 500;
      line-height: 16px;
      margin: 0;
    }
  }
`;

const ManageApprovalsContent: React.FC = () => {
  const { t } = useTranslation();
  const { filterType, setFilterType } = useApprovalsPage();
  const { totalCount: eip7702TotalCount } = useEIP7702Approvals();

  return (
    <Container className="bg-r-neutral-bg-2">
      <PageHeader
        className="mx-[20px] mb-[3px]"
        isShowAccount
        rightSlot={
          <div className="absolute right-0 top-[50%] flex items-center gap-[16px] translate-y-[-50%]">
            <div
              className="relative cursor-pointer text-r-neutral-title1 hit-slop-8"
              onClick={() => {
                openInTab('desktop.html#/desktop/manage-approvals');
              }}
            >
              <RcIconFullscreen />
            </div>
          </div>
        }
      >
        {t('page.manageApprovals.title')}
      </PageHeader>

      <Tabs
        activeKey={filterType}
        onChange={(activeKey) => {
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
    </Container>
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
