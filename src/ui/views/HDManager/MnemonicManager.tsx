import React from 'react';
import { MainContainer } from './MainContainer';
import { ReactComponent as RcSettingSVG } from 'ui/assets/setting-outline-cc.svg';
import {
  AdvancedSettings,
  SettingData,
  DEFAULT_SETTING_DATA,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { Account } from './AccountList';
import { HDManagerStateContext } from './utils';
import { useTranslation } from 'react-i18next';
import { KEYRING_CLASS } from '@/constant';
import { useWallet } from '@/ui/utils';
import { Modal } from '@/ui/component';

export type InitAccounts = {
  [key in HDPathType]: Account[];
};

const MNEMONIC_TYPE = KEYRING_CLASS.MNEMONIC;

export const MnemonicManager: React.FC = () => {
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

  const fetchCurrentAccounts = React.useCallback(async () => {
    setLoading(true);
    await createTask(() => getCurrentAccounts());
    setSetting({
      ...setting,
      type: HDPathType.BIP44,
    });
    setLoading(false);
  }, []);
  const { t } = useTranslation();

  React.useEffect(() => {
    changeHDPathTask(HDPathType.BIP44);
    fetchCurrentAccounts();
  }, []);

  const changeHDPathTask = React.useCallback(async (type: HDPathType) => {
    await createTask(() =>
      wallet.requestKeyring(MNEMONIC_TYPE, 'setHDPathType', keyringId, type)
    );
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

      <MainContainer setting={setting} loading={loading} HDName="Seed Phrase" />

      <Modal
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
      </Modal>
    </>
  );
};
