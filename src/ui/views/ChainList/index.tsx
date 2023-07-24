import { CHAINS } from 'consts';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { PageHeader } from 'ui/component';
import './style.less';
import { Chain } from '@debank/common';
import NetSwitchTabs, {
  useSwitchNetTab,
} from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { Tabs } from 'antd';

const Null = () => null;

const List = ({ list }: { list: Chain[] }) => {
  return (
    <div className="overflow-auto max-h-full">
      <div className="chain-list">
        {list.map((item) => {
          return (
            <div className="chain-list-item" key={item.id}>
              <img src={item.logo} alt="" />
              {item.name}
            </div>
          );
        })}
        {list.length % 2 !== 0 && <div className="chain-list-item"></div>}
      </div>
    </div>
  );
};

const ChainList = () => {
  const history = useHistory();
  const goBack = () => {
    history.goBack();
  };

  const { selectedTab, onTabChange } = useSwitchNetTab();

  const list = useMemo(
    () =>
      Object.values(CHAINS).sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
        return 1;
      }),
    []
  );

  const [mainnet, testnet] = useMemo(() => {
    return [
      list.filter((item) => !item.isTestnet),
      list.filter((item) => item.isTestnet),
    ];
  }, []);
  const renderTabBar = React.useCallback(() => <Null />, []);

  return (
    <div className="page-chain-list">
      <PageHeader onBack={goBack} fixed>
        {list.length} chains supported
      </PageHeader>
      <NetSwitchTabs
        value={selectedTab}
        onTabChange={onTabChange}
        className="h-[28px] box-content  mb-[14px]"
      />
      <Tabs
        className="h-full"
        renderTabBar={renderTabBar}
        activeKey={selectedTab}
      >
        <Tabs.TabPane key="mainnet" destroyInactiveTabPane={false}>
          <List list={mainnet} />
        </Tabs.TabPane>
        <Tabs.TabPane key="testnet">
          <List list={testnet} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default ChainList;
