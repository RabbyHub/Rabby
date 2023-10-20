import { Tabs } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';

import IconArrowRight from '@/ui/assets/history/icon-arrow-right.svg';
import NetSwitchTabs, {
  useSwitchNetTab,
} from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { PageHeader } from 'ui/component';
import { HistoryList } from './components/HistoryList';
import './style.less';
import qs from 'qs';

const Null = () => null;

const History = () => {
  const { t } = useTranslation();
  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();
  const renderTabBar = React.useCallback(() => <Null />, []);
  const history = useHistory();

  return (
    <div className="txs-history">
      <PageHeader fixed>{t('page.transactions.title')}</PageHeader>
      {isShowTestnet && (
        <NetSwitchTabs
          value={selectedTab}
          onTabChange={onTabChange}
          className="h-[28px] box-content mt-[20px] mb-[20px]"
        />
      )}
      <div
        className="filter-scam-nav hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10"
        onClick={() => {
          history.push(`/history/filter-scam?net=${selectedTab}`);
        }}
      >
        {t('page.transactions.filterScam.btn')}
        <img src={IconArrowRight} alt="" />
      </div>
      <Tabs
        className="h-full"
        renderTabBar={renderTabBar}
        activeKey={selectedTab}
      >
        <Tabs.TabPane key="mainnet" destroyInactiveTabPane={false}>
          <HistoryList isMainnet />
        </Tabs.TabPane>
        <Tabs.TabPane key="testnet">
          <HistoryList isMainnet={false} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

const HistoryFilterScam = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const query = useMemo(() => {
    return qs.parse(location.search, {
      ignoreQueryPrefix: true,
    });
  }, [location.search]);

  return (
    <div className="txs-history">
      <PageHeader fixed>{t('page.transactions.filterScam.title')}</PageHeader>
      <HistoryList isMainnet={query.net !== 'testnet'} isFilterScam={true} />
    </div>
  );
};

export const HistoryPage = ({
  isFitlerScam = false,
}: {
  isFitlerScam?: boolean;
}) => {
  return isFitlerScam ? <HistoryFilterScam /> : <History />;
};
