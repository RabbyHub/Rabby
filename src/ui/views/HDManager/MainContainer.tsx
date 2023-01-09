import { Tabs } from 'antd';
import React from 'react';
import { AddressesInHD } from './AddressesInHD';
import { AddressesInRabby } from './AddressesInRabby';
import { SettingData, MAX_ACCOUNT_COUNT } from './AdvancedSettings';
import { HDManagerStateContext } from './utils';

interface Props {
  setting: SettingData;
  loading: boolean;
  HDName: string;
}

export const MainContainer: React.FC<Props> = ({
  setting,
  loading,
  HDName,
}) => {
  const {
    getCurrentAccounts,
    currentAccounts,
    setTab,
    tab,
    createTask,
  } = React.useContext(HDManagerStateContext);

  React.useEffect(() => {
    const handleFocus = () => {
      createTask(() => getCurrentAccounts());
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const filterCurrentAccounts = React.useMemo(() => {
    return currentAccounts?.filter((item) => {
      return (
        item.index >= setting.startNo &&
        item.index < setting.startNo + MAX_ACCOUNT_COUNT
      );
    });
  }, [setting.startNo, currentAccounts]);

  return (
    <Tabs
      activeKey={tab}
      onChange={(active) => setTab(active as any)}
      className="tabs"
    >
      <Tabs.TabPane tab={`Addresses in ${HDName}`} key="ledger">
        <AddressesInHD
          type={setting.type}
          startNo={setting.startNo}
          loading={loading}
        />
      </Tabs.TabPane>
      <Tabs.TabPane
        tab={`Addresses in Rabby${
          loading ? '' : ` (${filterCurrentAccounts.length})`
        }`}
        key="rabby"
        disabled={loading}
      >
        <AddressesInRabby
          type={setting.type}
          startNo={setting.startNo}
          loading={loading}
          data={filterCurrentAccounts}
        />
      </Tabs.TabPane>
    </Tabs>
  );
};
