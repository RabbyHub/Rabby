import { Tabs } from 'antd';
import { isBoolean } from 'lodash';
import React from 'react';
import { AddressesInHD } from './AddressesInHD';
import { AddressesInRabby } from './AddressesInRabby';
import { SettingData, MAX_ACCOUNT_COUNT } from './AdvancedSettings';
import { HDManagerStateContext } from './utils';
import { useTranslation } from 'react-i18next';

interface Props {
  setting: SettingData;
  loading: boolean;
  HDName: string;
  firstFetchAccounts?: boolean;
  preventLoading?: boolean;
}

export const MainContainer: React.FC<Props> = ({
  setting,
  loading,
  HDName,
  firstFetchAccounts,
  preventLoading,
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
      if (isBoolean(firstFetchAccounts) && !firstFetchAccounts) {
        return;
      }
      createTask(getCurrentAccounts);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [firstFetchAccounts]);

  const filterCurrentAccounts = React.useMemo(() => {
    return currentAccounts?.filter((item) => {
      return (
        item.index >= setting.startNo &&
        item.index < setting.startNo + MAX_ACCOUNT_COUNT
      );
    });
  }, [setting.startNo, currentAccounts]);

  const { t } = useTranslation();

  return (
    <Tabs
      activeKey={tab}
      onChange={(active) => setTab(active as any)}
      className="tabs"
    >
      <Tabs.TabPane
        tab={t('page.newAddress.hd.addressesIn', [HDName])}
        key="hd"
      >
        <AddressesInHD
          type={setting.type}
          startNo={setting.startNo}
          loading={loading}
          preventLoading={preventLoading}
        />
      </Tabs.TabPane>
      <Tabs.TabPane
        tab={t('page.newAddress.hd.addressesInRabby', [
          loading ? '' : ` (${filterCurrentAccounts.length})`,
        ])}
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
