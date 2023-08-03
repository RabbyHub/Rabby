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
import { useAsyncRetry } from 'react-use';
import * as Sentry from '@sentry/browser';

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
      content: `Cannot connect to BitBox02. Please refresh the page to connect again.
Reason: ${errMessage}`,
      okText: 'Refresh',
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
          <SettingSVG className="icon" />
          <span className="title">Advanced Settings</span>
        </div>
      </div>

      <MainContainer
        firstFetchAccounts={firstFetchAccounts}
        setting={setting}
        loading={loading}
        HDName="BitBox02"
        preventLoading={preventLoading}
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
