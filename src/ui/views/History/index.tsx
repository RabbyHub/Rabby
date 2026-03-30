import { message, Switch, Tabs, Tooltip } from 'antd';
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
  const [isHideScam, setIsHideScam] = React.useState(true);

  return (
    <div className="txs-history">
      <PageHeader
        className="transparent-wrap"
        fixed
        rightSlot={
          selectedTab === 'mainnet' ? (
            <div className="flex absolute right-0">
              <Tooltip
                title={t('page.transactions.hideScamTips')}
                overlayClassName="rectangle"
                placement="bottomLeft"
              >
                <Switch
                  checked={isHideScam}
                  onChange={(v) => {
                    setIsHideScam(v);
                    message.success(
                      v
                        ? t('page.transactions.hideScamTips')
                        : t('page.transactions.showScamTips')
                    );
                  }}
                />
              </Tooltip>
            </div>
          ) : null
        }
      >
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
          <HistoryList isFilterScam={isHideScam} />
        </Tabs.TabPane>
        <Tabs.TabPane key="testnet" className="h-full">
          <TestnetTransactionHistory />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};
