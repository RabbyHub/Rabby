import { Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';

import { ReactComponent as RcIconArrowRight } from '@/ui/assets/history/icon-arrow-right.svg';
import NetSwitchTabs, {
  useSwitchNetTab,
} from '@/ui/component/PillsSwitch/NetSwitchTabs';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { Empty, PageHeader } from 'ui/component';
import { HistoryList } from './components/HistoryList';
import './style.less';
import { TestnetTransactionHistory } from '../TransactionHistory/TestnetTranasctionHistory';

const Null = () => null;
const renderTabBar = () => <Null />;

export const HistoryPage = () => {
  const { t } = useTranslation();
  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();
  const history = useHistory();

  return (
    <div className="txs-history">
      <PageHeader className="transparent-wrap" fixed>
        {t('page.transactions.title')}
      </PageHeader>
      {isShowTestnet && (
        <div className="flex-shrink-0">
          <NetSwitchTabs value={selectedTab} onTabChange={onTabChange} />
        </div>
      )}
      <Tabs
        className="h-full"
        renderTabBar={renderTabBar}
        activeKey={selectedTab}
      >
        <Tabs.TabPane
          key="mainnet"
          destroyInactiveTabPane={false}
          className="h-full"
        >
          <HistoryList isFilterScam />
        </Tabs.TabPane>
        <Tabs.TabPane key="testnet" className="h-full">
          <TestnetTransactionHistory />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};
