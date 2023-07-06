import { Modal } from 'antd';
import React from 'react';
import {
  AdvancedSettings,
  DEFAULT_SETTING_DATA,
  SettingData,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { MainContainer } from './MainContainer';
import { ReactComponent as SettingSVG } from 'ui/assets/setting-outline.svg';
import { ReactComponent as HardwareSVG } from 'ui/assets/import/hardware.svg';
import { useWallet } from '@/ui/utils';
import { Account } from './AccountList';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { fetchAccountsInfo, HDManagerStateContext } from './utils';

export type InitAccounts = {
  [key in HDPathType]: Account[];
};

const GRIDPLUS_TYPE = HARDWARE_KEYRING_TYPES.GridPlus.type;

export const GridPlusManager: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const { getCurrentAccounts, createTask, keyringId } = React.useContext(
    HDManagerStateContext
  );
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const wallet = useWallet();
  const [initAccounts, setInitAccounts] = React.useState<InitAccounts>();

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
        wallet.requestKeyring(GRIDPLUS_TYPE, 'getInitialAccounts', keyringId)
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
            GRIDPLUS_TYPE,
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
      wallet.requestKeyring(GRIDPLUS_TYPE, 'setHDPathType', keyringId, type)
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

  const openSwitchHD = React.useCallback(async () => {
    Modal.error({
      title: 'Switch to a new GridPlus device',
      content:
        "It's not supported to import multiple GridPlus devices If you switch to a new GridPlus device, the current device's address list will be removed before starting the import process.",
      okText: 'Confirm',
      onOk: async () => {
        const accounts = await wallet.requestKeyring(
          GRIDPLUS_TYPE,
          'getAccounts',
          keyringId
        );
        console.log(accounts);
        await Promise.all(
          accounts.map(async (account) =>
            wallet.removeAddress(account, GRIDPLUS_TYPE, undefined, true)
          )
        );
        window.location.reload();
      },
      okCancel: false,
      centered: true,
      closable: true,
      maskClosable: true,
      className: 'hd-manager-switch-modal',
    });
  }, []);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-item" onClick={openSwitchHD}>
          <HardwareSVG className="icon" />
          <span className="title">Switch to another GridPlus</span>
        </div>
        <div className="toolbar-item" onClick={openAdvanced}>
          <SettingSVG className="icon" />
          <span className="title">Advanced Settings</span>
        </div>
      </div>

      <MainContainer setting={setting} loading={loading} HDName={'GridPlus'} />

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
