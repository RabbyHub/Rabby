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

interface Props {
  HDName?: string;
}

export const TrezorManager: React.FC<Props> = ({ HDName = 'Trezor' }) => {
  const [loading, setLoading] = React.useState(true);
  const { getCurrentAccounts, createTask } = React.useContext(
    HDManagerStateContext
  );
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );

  const openAdvanced = React.useCallback(() => {
    if (loading) {
      return;
    }
    setVisibleAdvanced(true);
  }, [loading]);

  const fetchCurrentAccounts = React.useCallback(async () => {
    setLoading(true);
    await createTask(getCurrentAccounts);
    setLoading(false);
  }, []);

  const onConfirmAdvanced = React.useCallback(async (data: SettingData) => {
    setVisibleAdvanced(false);
    await fetchCurrentAccounts();
    setSetting({
      ...data,
      type: HDPathType.BIP44,
    });
  }, []);

  React.useEffect(() => {
    fetchCurrentAccounts();
  }, []);

  return (
    <>
      <div className="setting" onClick={openAdvanced}>
        <SettingSVG className="icon" />
        <span className="title">Advanced Settings</span>
      </div>

      <MainContainer
        setting={{
          ...setting,
          type: HDPathType.BIP44,
        }}
        loading={loading}
        HDName={HDName}
      />

      <Modal
        destroyOnClose
        className="AdvancedModal"
        title="Custom Address HD path"
        visible={visibleAdvanced}
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
