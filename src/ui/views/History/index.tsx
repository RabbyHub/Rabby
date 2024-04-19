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

const Null = () => null;

const History = () => {
  const { t } = useTranslation();
  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab();
  const renderTabBar = React.useCallback(() => <Null />, []);
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
          <Empty
            desc={
              <div className="mt-[-12px] text-r-neutral-foot leading-[20px]">
                {t('global.notSupportTesntnet')}
              </div>
            }
            className="pt-[108px]"
          ></Empty>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

const HistoryFilterScam = () => {
  const { t } = useTranslation();

  return (
    <div className="txs-history">
      <PageHeader className="transparent-wrap" fixed>
        {t('page.transactions.filterScam.title')}
      </PageHeader>
      <HistoryList isFilterScam={true} />
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
