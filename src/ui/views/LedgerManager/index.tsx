import { Tabs } from 'antd';
import React from 'react';
import './index.less';
import { ReactComponent as LedgerLogoSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as SettingSVG } from 'ui/assets/setting-outline.svg';
import { AddressesInLedger } from './AddressesInLedger';
import { AddressesInRabby } from './AddressesInRabby';
import { Modal } from 'antd';
import {
  AdvancedSettings,
  SettingData,
  DEFAULT_SETTING_DATA,
} from './AdvancedSettings';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { HDPathType } from './HDPathTypeButton';
import { Account } from './AccountList';
import { fetchAccountsInfo, useGetCurrentAccounts } from './utils';

export type InitAccounts = {
  [key in HDPathType]: Account[];
};

export const LedgerManager: React.FC = () => {
  const wallet = useWallet();
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const [initAccounts, setInitAccounts] = React.useState<InitAccounts>();
  const [loading, setLoading] = React.useState(false);
  const {
    loading: currentAccountsLoading,
    getCurrentAccounts,
    accounts: currentAccounts,
  } = useGetCurrentAccounts();

  const openAdvanced = React.useCallback(() => {
    if (loading) {
      return;
    }
    setVisibleAdvanced(true);
  }, [loading]);

  const onConfirmAdvanced = React.useCallback(async (data: SettingData) => {
    setVisibleAdvanced(false);
    if (data.type) {
      await changeHDPath(data.type);
    }
    await getCurrentAccounts();
    setSetting(data);
  }, []);

  const fetchInitAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const accounts = (await wallet.requestKeyring(
        HARDWARE_KEYRING_TYPES.Ledger.type,
        'getInitialAccounts',
        null
      )) as InitAccounts;

      // fetch balance and transaction information
      for (const key in accounts) {
        const items = accounts[key] as Account[];
        accounts[key] = await fetchAccountsInfo(wallet, items);
      }
      setInitAccounts(accounts);
      detectInitialHDPathType(accounts);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }, []);

  const changeHDPath = React.useCallback(async (type: HDPathType) => {
    const hdPathBase = await wallet.requestKeyring(
      HARDWARE_KEYRING_TYPES.Ledger.type,
      'getHDPathBase',
      null,
      type
    );
    await wallet.requestKeyring(
      HARDWARE_KEYRING_TYPES.Ledger.type,
      'setHdPath',
      null,
      hdPathBase
    );
  }, []);

  const detectInitialHDPathType = React.useCallback(
    async (accounts: InitAccounts) => {
      let initialHDPathType = HDPathType.LedgerLive;
      let maxChainLength = 0;
      for (const key in accounts) {
        const items = accounts[key] as Account[];
        items.forEach((account) => {
          const chainLen = account.chains?.length ?? 0;

          if (chainLen > maxChainLength) {
            maxChainLength = chainLen;
            initialHDPathType = key as HDPathType;
          }
        });
      }

      await changeHDPath(initialHDPathType);
      await getCurrentAccounts();
      setSetting((prev) => ({
        ...prev,
        type: initialHDPathType,
      }));

      return initialHDPathType;
    },
    []
  );

  React.useEffect(() => {
    fetchInitAccounts();
  }, []);

  const tableLoading = loading || currentAccountsLoading;

  return (
    <div className="LedgerManager">
      <main>
        <div className="logo">
          <LedgerLogoSVG className="icon" />
          <span className="title">Connected to Ledger</span>
        </div>
        <div className="setting" onClick={openAdvanced}>
          <SettingSVG className="icon" />
          <span className="title">Advanced Settings</span>
        </div>
        <Tabs className="tabs" destroyInactiveTabPane>
          <Tabs.TabPane tab="Addresses in Ledger" key="ledger">
            <AddressesInLedger
              type={setting.type}
              startNo={setting.startNo}
              loading={tableLoading}
              currentAccounts={currentAccounts}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Addresses in Rabby" key="rabby" disabled={loading}>
            <AddressesInRabby
              type={setting.type}
              startNo={setting.startNo}
              loading={tableLoading}
              currentAccounts={currentAccounts}
            />
          </Tabs.TabPane>
        </Tabs>
        <Modal
          className="AdvancedModal"
          title="Custom Address HD path"
          visible={visibleAdvanced}
          width={840}
          footer={[]}
          onCancel={() => setVisibleAdvanced(false)}
        >
          <AdvancedSettings
            initAccounts={initAccounts}
            onConfirm={onConfirmAdvanced}
            initSettingData={setting}
          />
        </Modal>
      </main>
    </div>
  );
};
