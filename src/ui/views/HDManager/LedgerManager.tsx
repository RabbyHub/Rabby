import React from 'react';
import { MainContainer } from './MainContainer';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { Modal } from 'antd';
import { ReactComponent as SettingSVG } from 'ui/assets/setting-outline.svg';
import {
  AdvancedSettings,
  SettingData,
  DEFAULT_SETTING_DATA,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { Account } from './AccountList';
import { fetchAccountsInfo, HDManagerStateContext } from './utils';

export type InitAccounts = {
  [key in HDPathType]: Account[];
};

const LEDGER_TYPE = HARDWARE_KEYRING_TYPES.Ledger.type;

export const LedgerManager: React.FC = () => {
  const wallet = useWallet();
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const [initAccounts, setInitAccounts] = React.useState<InitAccounts>();
  const [loading, setLoading] = React.useState(false);
  const { getCurrentAccounts, createTask, keyringId } = React.useContext(
    HDManagerStateContext
  );

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
        let maxUsedCount = 0;
        for (const key in accounts) {
          const items = accounts[key] as Account[];
          const usedCount =
            items.filter((item) => !!item.chains?.length).length ?? 0;

          if (usedCount > maxUsedCount) {
            maxUsedCount = usedCount;
            initialHDPathType = key as HDPathType;
          }
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

  return (
    <>
      <div className="setting" onClick={openAdvanced}>
        <SettingSVG className="icon" />
        <span className="title">Advanced Settings</span>
      </div>

      <MainContainer setting={setting} loading={loading} HDName="Ledger" />

      <Modal
        destroyOnClose
        className="AdvancedModal"
        title="Custom Address HD path"
        visible={visibleAdvanced}
        centered
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
    </>
  );
};
