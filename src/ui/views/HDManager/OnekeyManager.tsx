import React from 'react';
import {
  AdvancedSettings,
  DEFAULT_SETTING_DATA,
  SettingData,
} from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { MainContainer } from './MainContainer';
import { HDManagerStateContext, sleep } from './utils';
import { ReactComponent as RcSettingSVG } from 'ui/assets/setting-outline-cc.svg';
import { ReactComponent as RcHardwareSVG } from 'ui/assets/import/hardware-cc.svg';
import { useAsyncRetry } from 'react-use';
import useModal from 'antd/lib/modal/useModal';
import * as Sentry from '@sentry/browser';
import { useTranslation } from 'react-i18next';
import { Modal as CustomModal } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';

const ONEKEY_TYPE = HARDWARE_KEYRING_TYPES.Onekey.type;

export const OneKeyManager: React.FC = () => {
  const history = useHistory();
  const wallet = useWallet();

  const [loading, setLoading] = React.useState(true);
  const {
    getCurrentAccounts,
    setSelectedAccounts,
    keyringId,
  } = React.useContext(HDManagerStateContext);
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const [firstFetchAccounts, setFirstFetchAccounts] = React.useState(false);
  const [preventLoading, setPreventLoading] = React.useState(false);

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
    setSelectedAccounts([]);
  }, []);

  const [modal, contextHolder] = useModal();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (fetchCurrentAccountsRetry.loading) {
      return;
    }
    const errMessage = fetchCurrentAccountsRetry.error?.message ?? '';
    if (!errMessage) {
      setFirstFetchAccounts(true);
      return;
    }

    // connect failed because previous connect is not closed
    if (/Manifest not set/.test(errMessage)) {
      sleep(1000).then(fetchCurrentAccountsRetry.retry);
    } else {
      setPreventLoading(true);
      console.log(errMessage);
      Sentry.captureException(fetchCurrentAccountsRetry.error);

      modal.error({
        content: t('page.newAddress.hd.trezor.message.disconnected', [
          'OneKey',
        ]),
        okText: t('global.refresh'),
        centered: true,
        onOk() {
          window.location.reload();
        },
      });
    }
  }, [fetchCurrentAccountsRetry.loading, fetchCurrentAccountsRetry.error]);

  const cleanUpDeviceState = React.useCallback(async () => {
    await wallet.requestKeyring(ONEKEY_TYPE, 'cleanUp', keyringId);
  }, [wallet, keyringId]);

  const openSwitchHD = React.useCallback(async () => {
    await cleanUpDeviceState();
    history.push('/import/hardware/onekey');
  }, []);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-item" onClick={openSwitchHD}>
          <RcHardwareSVG className="icon text-r-neutral-title1" />
          <span className="title">
            {t('page.newAddress.hd.qrCode.switchAnother', ['OneKey'])}
          </span>
        </div>
        <div className="toolbar-item" onClick={openAdvanced}>
          <RcSettingSVG className="icon text-r-neutral-title1" />
          <span className="title">
            {t('page.newAddress.hd.advancedSettings')}
          </span>
        </div>
      </div>

      <MainContainer
        firstFetchAccounts={firstFetchAccounts}
        setting={setting}
        loading={loading}
        HDName={'OneKey'}
        preventLoading={preventLoading}
      />

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
      {contextHolder}
    </>
  );
};
