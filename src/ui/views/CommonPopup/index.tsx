import { Popup } from '@/ui/component';
import { useCommonPopupView } from '@/ui/utils';
import React from 'react';
import Approval from '../Approval';
import { ReconnectView } from '@/ui/component/WalletConnect/ReconnectView';
import { SwitchAddress } from './SwitchAddress';
import { SwitchChain } from './SwitchChain';
import { Ledger } from './Ledger';
import { Keystone } from './Keystone';
import { AssetList } from './AssetList/AssetList';
import { CancelApproval } from './CancelApproval/CancelApproval';
import { CancelConnect } from './CancelConnect/CancelConnect';
import { ImKeyPermission } from './ImKeyPermission';

export type CommonPopupComponentName =
  | 'Approval'
  | 'WalletConnect'
  | 'SwitchAddress'
  | 'SwitchChain'
  | 'AssetList'
  | 'Ledger'
  | 'ImKeyPermission'
  | 'Keystone'
  | 'CancelConnect'
  | 'CancelApproval';

const ComponentConfig = {
  AssetList: {
    title: null,
    closeable: false,
    titleSize: '16px',
    padding: '12px 20px',
    isNew: false,
  },
  Default: {
    title: undefined,
    closeable: true,
    titleSize: '16px',
    padding: '20px 20px 24px',
    isNew: true,
  },
  Approval: {
    closeable: false,
    titleSize: '15px',
    maskClosable: false,
    padding: '16px',
    isNew: true,
  },
  CancelApproval: {
    padding: '8px 20px 22px',
    titleSize: '20px',
    closeable: true,
    isNew: true,
  },
  CancelConnect: {
    padding: '8px 20px 22px',
    titleSize: '20px',
    closeable: true,
    isNew: true,
  },
  Ledger: {
    closeable: true,
    titleSize: '20px',
    padding: '20px 10px 24px',
    isNew: true,
  },
};

export const CommonPopup: React.FC = () => {
  const {
    visible,
    setVisible,
    title,
    height,
    className,
    componentName,
  } = useCommonPopupView();

  const config =
    ComponentConfig[componentName as CommonPopupComponentName] ||
    ComponentConfig.Default;

  if (config.title !== null && title) {
    config.title = title;
  }

  return (
    <Popup
      title={
        config.title ? (
          <span
            style={{
              fontSize: config.titleSize,
            }}
          >
            {config.title}
          </span>
        ) : null
      }
      mask={height !== 0}
      closable={config.closeable}
      maskClosable={config.maskClosable}
      height={height}
      onClose={() => setVisible(false)}
      visible={visible && !!componentName}
      className={className}
      destroyOnClose={false}
      push={false}
      bodyStyle={{
        padding: config.padding,
      }}
      isSupportDarkMode
      isNew={config.isNew}
    >
      {componentName === 'Approval' && <Approval className="h-full" />}
      {componentName === 'WalletConnect' && <ReconnectView />}
      {componentName === 'SwitchAddress' && <SwitchAddress />}
      {componentName === 'SwitchChain' && <SwitchChain />}
      {componentName === 'Ledger' && <Ledger />}
      {componentName === 'ImKeyPermission' && <ImKeyPermission />}
      {componentName === 'Keystone' && <Keystone />}
      {componentName === 'AssetList' && (
        <AssetList
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
        />
      )}
      {componentName === 'CancelApproval' && <CancelApproval />}
      {componentName === 'CancelConnect' && <CancelConnect />}
    </Popup>
  );
};
