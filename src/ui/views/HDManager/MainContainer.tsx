// import { Tabs } from 'antd';
import { isBoolean } from 'lodash';
import React from 'react';
import { AddressesInHD } from './AddressesInHD';
import { AddressesInRabby } from './AddressesInRabby';
import { SettingData, MAX_ACCOUNT_COUNT } from './AdvancedSettings';
import { HDManagerStateContext } from './utils';
import { useTranslation } from 'react-i18next';
import { Box, Tabs, Text } from '@radix-ui/themes';

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
    <>
      <Tabs.Root defaultValue="hd">
        <Tabs.List size="2">
          <Tabs.Trigger value="hd">
            {t('page.newAddress.hd.addressesIn', [HDName])}
          </Tabs.Trigger>
          <Tabs.Trigger value="rabby">
            {t('page.newAddress.hd.addressesInRabby', [
              loading ? '' : ` (${filterCurrentAccounts.length})`,
            ])}
          </Tabs.Trigger>
          {/*<Tabs.Trigger value="settings">Settings</Tabs.Trigger>*/}
        </Tabs.List>

        <Box pt="3">
          <Tabs.Content value="hd">
            <Text size="2">
              <AddressesInHD
                setting={setting}
                loading={loading}
                preventLoading={preventLoading}
              />
            </Text>
          </Tabs.Content>

          <Tabs.Content value="rabby">
            <Text size="2">
              <AddressesInRabby
                type={setting.type}
                startNo={setting.startNo}
                loading={loading}
                data={filterCurrentAccounts}
              />
            </Text>
          </Tabs.Content>

          {/*<Tabs.Content value="settings">
            <Text size="2">
              Edit your profile or update contact information.
            </Text>
          </Tabs.Content>*/}
        </Box>
      </Tabs.Root>

      {/*<Tabs
        activeKey={tab}
        onChange={(active) => setTab(active as any)}
        className="tabs"
      >
        <Tabs.TabPane
          tab={t('page.newAddress.hd.addressesIn', [HDName])}
          key="hd"
        >
          <AddressesInHD
            setting={setting}
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
      </Tabs>*/}
    </>
  );
};
