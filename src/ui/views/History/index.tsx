// import { Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';

import { ReactComponent as RcIconArrowRight } from '@/ui/assets/history/icon-arrow-right.svg';
import NetSwitchTabs, {
  useSwitchNetTab,
} from '@/ui/component/PillsSwitch/NetSwitchTabs';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
// import { Empty, PageHeader } from 'ui/component';
import { HistoryList } from './components/HistoryList';
import './style.less';
import { TestnetTransactionHistory } from '../TransactionHistory/TestnetTranasctionHistory';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import { Box, Tabs, Text } from '@radix-ui/themes';
import TransactionHistory from 'ui/views/TransactionHistory';
import SignedTextHistory from 'ui/views/SignedTextHistory';

const Null = () => null;

const History = () => {
  const { t } = useTranslation();
  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();
  const renderTabBar = React.useCallback(() => <Null />, []);
  const history = useHistory();

  return (
    <>
      <PageContainer>
        <PageHeader showBackButton>
          <PageHeading>{t('page.transactions.title')}</PageHeading>
        </PageHeader>

        <PageBody>
          <Tabs.Root
            defaultValue={selectedTab}
            // onValueChange={(value) => setSelectedTab(value as TabType)}
          >
            <Tabs.List
              highContrast
              style={{
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--gray-1)',
                zIndex: 10,
              }}
            >
              <Tabs.Trigger value="mainnet">
                {t('page.chainList.mainnet')}
              </Tabs.Trigger>
              <Tabs.Trigger value="testnet">
                {t('page.chainList.testnet')}
              </Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="mainnet">
                <Text size="2">
                  <HistoryList />
                </Text>
              </Tabs.Content>

              <Tabs.Content value="testnet">
                <Text size="2">
                  <TestnetTransactionHistory />
                </Text>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </PageBody>
      </PageContainer>

      {/*<div className="txs-history">
        <PageHeader className="transparent-wrap" fixed>
          {t('page.transactions.title')}
        </PageHeader>
        {isShowTestnet && (
          <div className="flex-shrink-0">
            <NetSwitchTabs value={selectedTab} onTabChange={onTabChange} />
          </div>
        )}
        {selectedTab === 'mainnet' ? (
          <div
            className="filter-scam-nav hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10"
            onClick={() => {
              history.push(`/history/filter-scam?net=${selectedTab}`);
            }}
          >
            {t('page.transactions.filterScam.btn')}
            <ThemeIcon src={RcIconArrowRight} />
          </div>
        ) : null}
        <Tabs
          className="h-full"
          renderTabBar={renderTabBar}
          activeKey={selectedTab}
        >
          <Tabs.TabPane key="mainnet" destroyInactiveTabPane={false}>
            <HistoryList />
          </Tabs.TabPane>
          <Tabs.TabPane key="testnet">
            <TestnetTransactionHistory />
          </Tabs.TabPane>
        </Tabs>
      </div>*/}
    </>
  );
};

const HistoryFilterScam = () => {
  const { t } = useTranslation();

  return (
    <>
      <HistoryList isFilterScam={true} />

      {/*<div className="txs-history">
        <PageHeader className="transparent-wrap" fixed>
          {t('page.transactions.filterScam.title')}
        </PageHeader>
        <HistoryList isFilterScam={true} />
      </div>*/}
    </>
  );
};

export const HistoryPage = ({
  isFitlerScam = false,
}: {
  isFitlerScam?: boolean;
}) => {
  return isFitlerScam ? <HistoryFilterScam /> : <History />;
};
