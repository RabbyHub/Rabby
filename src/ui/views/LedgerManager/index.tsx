import { Button, Tabs } from 'antd';
import React from 'react';
import './index.less';
import { ReactComponent as LedgerLogoSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as SettingSVG } from 'ui/assets/setting-outline.svg';
import { AddressesInLedger } from './AddressesInLedger';
import { AddressesInRabby } from './AddressesInRabby';
import { Modal } from 'antd';
import {
  AdvancedSettings,
  SettingData,
  DEFAULT_SETTING_DATA,
} from './AdvancedSettings';

export const LedgerManager: React.FC = () => {
  const [visibleAdvanced, setVisibleAdvanced] = React.useState(false);
  const [setting, setSetting] = React.useState<SettingData>(
    DEFAULT_SETTING_DATA
  );

  const openAdvanced = React.useCallback(() => {
    setVisibleAdvanced(true);
  }, []);

  const onConfirmAdvanced = React.useCallback((data: SettingData) => {
    setVisibleAdvanced(false);
    setSetting(data);
  }, []);

  return (
    <div className="LedgerManager">
      <div className="logo">
        <LedgerLogoSVG className="icon" />
        <span className="title">Connected to Ledger</span>
      </div>
      <div className="setting" onClick={openAdvanced}>
        <SettingSVG className="icon" />
        <span className="title">Advanced Settings</span>
      </div>
      <Tabs className="tabs">
        <Tabs.TabPane tab="Addresses in Ledger" key="ledger">
          <AddressesInLedger />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Addresses in Rabby" key="rabby">
          <AddressesInRabby />
        </Tabs.TabPane>
      </Tabs>
      <Modal
        className="AdvancedModal"
        title="Custom Address HD path"
        visible={visibleAdvanced}
        width={840}
        footer={[]}
      >
        <AdvancedSettings onConfirm={onConfirmAdvanced} />
      </Modal>
    </div>
  );
};
