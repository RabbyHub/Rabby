import React from 'react';
import { MainContainer } from './MainContainer';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { Modal } from 'antd';
import { ReactComponent as RcSettingSVG } from 'ui/assets/setting-outline.svg';
import {
  AdvancedSettings,
  SettingData,
  DEFAULT_SETTING_DATA,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { Account } from './AccountList';
import { HDManagerStateContext } from './utils';
import { useTranslation } from 'react-i18next';
import { Modal as CustomModal } from '@/ui/component';

export type InitAccounts = {
  [key in HDPathType]: Account[];
};

const IM_KEY_TYPE = HARDWARE_KEYRING_TYPES.ImKey.type;

export const ImKeyManager: React.FC = () => {
  const wallet = useWallet();
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
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

  const changeHDPathTask = React.useCallback(async (type: HDPathType) => {
    await createTask(() =>
      wallet.requestKeyring(IM_KEY_TYPE, 'setHDPathType', keyringId, type)
    );
  }, []);

  const { t } = useTranslation();

  React.useEffect(() => {
    setSetting((prev) => ({
      ...prev,
      type: HDPathType.BIP44,
    }));
    createTask(() => getCurrentAccounts());
  }, []);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-item" onClick={openAdvanced}>
          <RcSettingSVG className="icon text-r-neutral-title1" />
          <span className="title">
            {t('page.newAddress.hd.advancedSettings')}
          </span>
        </div>
      </div>

      <MainContainer setting={setting} loading={loading} HDName="imKey" />

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
          onConfirm={onConfirmAdvanced}
          initSettingData={setting}
        />
      </CustomModal>
    </>
  );
};
