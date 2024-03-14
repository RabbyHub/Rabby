import { Modal } from 'antd';
import React from 'react';
import {
  AdvancedSettings,
  DEFAULT_SETTING_DATA,
  SettingData,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { MainContainer } from './MainContainer';
import { ReactComponent as RcSettingSVG } from 'ui/assets/setting-outline-cc.svg';
import { ReactComponent as RcHardwareSVG } from 'ui/assets/import/hardware-cc.svg';
import { useWallet } from '@/ui/utils';
import { Account } from './AccountList';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { fetchAccountsInfo, HDManagerStateContext } from './utils';
import { useTranslation } from 'react-i18next';
import { Modal as CustomModal } from '@/ui/component';

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
  const { t } = useTranslation();
  const openSwitchHD = React.useCallback(async () => {
    Modal.error({
      title: t('page.newAddress.hd.gridplus.switch.title'),
      content: t('page.newAddress.hd.gridplus.switch.content'),
      okText: t('global.confirm'),
      onOk: async () => {
        const accounts = await wallet.requestKeyring(
          GRIDPLUS_TYPE,
          'getAccounts',
          keyringId
        );
        await Promise.all(
          accounts.map(async (account) =>
            wallet.removeAddress(account, GRIDPLUS_TYPE, undefined, true)
          )
        );
        await wallet.requestKeyring(GRIDPLUS_TYPE, 'forgetDevice', keyringId);
        window.location.reload();
      },
      okCancel: false,
      centered: true,
      closable: true,
      maskClosable: true,
      className: 'hd-manager-switch-modal modal-support-darkmode',
    });
  }, []);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-item" onClick={openSwitchHD}>
          <RcHardwareSVG className="icon text-r-neutral-title1" />
          <span className="title">
            {t('page.newAddress.hd.gridplus.switchToAnotherGridplus')}
          </span>
        </div>
        <div className="toolbar-item" onClick={openAdvanced}>
          <RcSettingSVG className="icon text-r-neutral-title1" />
          <span className="title">
            {t('page.newAddress.hd.advancedSettings')}
          </span>
        </div>
      </div>

      <MainContainer setting={setting} loading={loading} HDName={'GridPlus'} />

      <CustomModal
        destroyOnClose
        className="AdvancedModal modal-support-darkmode"
        title={t('page.newAddress.hd.customAddressHdPath')}
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
      </CustomModal>
    </>
  );
};
