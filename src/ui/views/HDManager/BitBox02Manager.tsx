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
import { ReactComponent as RcSettingSVG } from 'ui/assets/setting-outline-cc.svg';
import { useAsyncRetry } from 'react-use';
import * as Sentry from '@sentry/browser';
import { useTranslation } from 'react-i18next';
import { Modal as CustomModal } from '@/ui/component';

export const BitBox02Manager: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const { getCurrentAccounts } = React.useContext(HDManagerStateContext);
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );
  const [firstFetchAccounts, setFirstFetchAccounts] = React.useState(false);

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
  const [preventLoading, setPreventLoading] = React.useState(false);

  const onConfirmAdvanced = React.useCallback(async (data: SettingData) => {
    setVisibleAdvanced(false);
    await fetchCurrentAccounts();
    setSetting({
      ...data,
      type: HDPathType.BIP44,
    });
  }, []);
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

    setPreventLoading(true);
    console.log(errMessage);
    Sentry.captureException(fetchCurrentAccountsRetry.error);

    Modal.error({
      content: t('page.newAddress.hd.bitbox02.disconnected', [errMessage]),
      okText: t('global.refresh'),
      centered: true,
      onOk() {
        window.location.reload();
      },
    });
  }, [fetchCurrentAccountsRetry.loading, fetchCurrentAccountsRetry.error]);

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

      <MainContainer
        firstFetchAccounts={firstFetchAccounts}
        setting={setting}
        loading={loading}
        HDName="BitBox02"
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
    </>
  );
};
