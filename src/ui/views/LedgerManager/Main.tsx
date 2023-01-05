import { Tabs } from 'antd';
import React from 'react';
import { ReactComponent as LedgerLogoSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as SettingSVG } from 'ui/assets/setting-outline.svg';
import { AddressesInLedger } from './AddressesInLedger';
import { AddressesInRabby } from './AddressesInRabby';
import { Modal } from 'antd';
import {
  AdvancedSettings,
  SettingData,
  DEFAULT_SETTING_DATA,
  MAX_ACCOUNT_COUNT,
} from './AdvancedSettings';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { HDPathType } from './HDPathTypeButton';
import { Account } from './AccountList';
import { fetchAccountsInfo, LedgerManagerStateContext } from './utils';

export type InitAccounts = {
  [key in HDPathType]: Account[];
};

const LEDGER_TYPE = HARDWARE_KEYRING_TYPES.Ledger.type;

export const Main: React.FC = () => {
  const wallet = useWallet();
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const [initAccounts, setInitAccounts] = React.useState<InitAccounts>();
  const [loading, setLoading] = React.useState(false);
  const {
    getCurrentAccounts,
    currentAccounts,
    setTab,
    tab,
    createTask,
    keyringId,
  } = React.useContext(LedgerManagerStateContext);

  const openAdvanced = React.useCallback(() => {
    if (loading) {
      return;
    }
    setVisibleAdvanced(true);
  }, [loading]);

  const onConfirmAdvanced = React.useCallback(async (data: SettingData) => {
    setVisibleAdvanced(false);
    setLoading(true);
    if (data.type) {
      await changeHDPathTask(data.type);
    }
    await createTask(() => getCurrentAccounts());
    setSetting(data);
    setLoading(false);
  }, []);

  const fetchInitAccountsTask = React.useCallback(async () => {
    setLoading(true);
    try {
      const accounts = (await createTask(() =>
        wallet.requestKeyring(LEDGER_TYPE, 'getInitialAccounts', keyringId)
      )) as InitAccounts;
      // fetch balance and transaction information
      for (const key in accounts) {
        const items = accounts[key] as Account[];
        accounts[key] = await fetchAccountsInfo(wallet, items);
      }
      setInitAccounts(accounts);

      // fetch current used HDPathType
      const usedHDPathType =
        ((await createTask(() =>
          wallet.requestKeyring(
            LEDGER_TYPE,
            'getCurrentUsedHDPathType',
            keyringId
          )
        )) as HDPathType) || undefined;

      detectInitialHDPathType(accounts, usedHDPathType);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }, []);

  const changeHDPathTask = React.useCallback(async (type: HDPathType) => {
    await createTask(() =>
      wallet.requestKeyring(LEDGER_TYPE, 'setHDPathType', keyringId, type)
    );
  }, []);

  const detectInitialHDPathType = React.useCallback(
    async (accounts: InitAccounts, usedHDPathType?: HDPathType) => {
      let initialHDPathType = usedHDPathType;

      if (!usedHDPathType) {
        initialHDPathType = HDPathType.LedgerLive;
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
      }

      await changeHDPathTask(initialHDPathType!);
      await createTask(() => getCurrentAccounts());
      setSetting((prev) => ({
        ...prev,
        type: initialHDPathType,
      }));

      return initialHDPathType;
    },
    []
  );

  React.useEffect(() => {
    fetchInitAccountsTask();
  }, []);

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
    <main>
      <div className="logo">
        <LedgerLogoSVG className="icon" />
        <span className="title">Connected to Ledger</span>
      </div>
      <div className="setting" onClick={openAdvanced}>
        <SettingSVG className="icon" />
        <span className="title">Advanced Settings</span>
      </div>
      <Tabs
        activeKey={tab}
        onChange={(active) => setTab(active as any)}
        className="tabs"
      >
        <Tabs.TabPane tab="Addresses in Ledger" key="ledger">
          <AddressesInLedger
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
      <Modal
        destroyOnClose
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
  );
};
