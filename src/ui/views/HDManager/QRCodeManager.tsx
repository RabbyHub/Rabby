import { Modal } from 'antd';
import React from 'react';
import {
  AdvancedSettings,
  DEFAULT_SETTING_DATA,
  SettingData,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { MainContainer } from './MainContainer';
import { HDManagerStateContext } from './utils';
import { ReactComponent as SettingSVG } from 'ui/assets/setting-outline.svg';
import { ReactComponent as HardwareSVG } from 'ui/assets/import/hardware.svg';
import { useAsyncRetry } from 'react-use';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';

interface Props {
  brand?: string;
}

const QRCODE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

export const QRCodeManager: React.FC<Props> = ({ brand }) => {
  const [loading, setLoading] = React.useState(true);
  const { getCurrentAccounts, keyringId } = React.useContext(
    HDManagerStateContext
  );
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const [firstFetchAccounts, setFirstFetchAccounts] = React.useState(false);
  const wallet = useWallet();

  const openAdvanced = React.useCallback(() => {
    if (loading) {
      return;
    }
    setVisibleAdvanced(true);
  }, [loading]);

  const fetchCurrentAccounts = React.useCallback(async () => {
    setLoading(true);
    await getCurrentAccounts();
    setSetting({
      ...setting,
      type: HDPathType.BIP44,
    });
    setLoading(false);
  }, []);
  const fetchCurrentAccountsRetry = useAsyncRetry(fetchCurrentAccounts);

  const onConfirmAdvanced = React.useCallback(async (data: SettingData) => {
    setVisibleAdvanced(false);
    await fetchCurrentAccounts();
    setSetting({
      ...data,
      type: HDPathType.BIP44,
    });
  }, []);

  React.useEffect(() => {
    if (brand) {
      wallet.requestKeyring(QRCODE_TYPE, 'setCurrentBrand', keyringId, brand);
    }
  }, [brand]);

  React.useEffect(() => {
    if (fetchCurrentAccountsRetry.loading) {
      return;
    }
    const errMessage = fetchCurrentAccountsRetry.error?.message ?? '';
    if (!errMessage) {
      setFirstFetchAccounts(true);
      return;
    }
  }, [fetchCurrentAccountsRetry.loading, fetchCurrentAccountsRetry.error]);

  const openSwitchHD = React.useCallback(async () => {
    console.log(123);
  }, []);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-item" onClick={openSwitchHD}>
          <HardwareSVG className="icon" />
          <span className="title">Switch to another {brand}</span>
        </div>
        <div className="toolbar-item" onClick={openAdvanced}>
          <SettingSVG className="icon" />
          <span className="title">Advanced Settings</span>
        </div>
      </div>

      <MainContainer
        firstFetchAccounts={firstFetchAccounts}
        setting={setting}
        loading={loading}
        HDName={brand ?? ''}
      />

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
          onConfirm={onConfirmAdvanced}
          initSettingData={setting}
        />
      </Modal>
    </>
  );
};
