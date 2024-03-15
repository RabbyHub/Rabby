import { Modal } from 'antd';
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
import { useAsyncRetry } from 'react-use';
import useModal from 'antd/lib/modal/useModal';
import * as Sentry from '@sentry/browser';
import { useTranslation } from 'react-i18next';
import { Modal as CustomModal } from '@/ui/component';

interface Props {
  HDName?: string;
}

export const TrezorManager: React.FC<Props> = ({ HDName = 'Trezor' }) => {
  const [loading, setLoading] = React.useState(true);
  const { getCurrentAccounts } = React.useContext(HDManagerStateContext);
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
        content: t('page.newAddress.hd.trezor.message.disconnected', [HDName]),
        okText: t('global.refresh'),
        centered: true,
        onOk() {
          window.location.reload();
        },
      });
    }
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
        HDName={HDName}
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
