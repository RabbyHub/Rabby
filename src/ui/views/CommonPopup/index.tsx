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

export type CommonPopupComponentName =
  | 'Approval'
  | 'WalletConnect'
  | 'SwitchAddress'
  | 'SwitchChain'
  | 'AssetList'
  | 'Ledger'
  | 'Keystone'
  | 'CancelConnect'
  | 'CancelApproval';

const ComponentConfig = {
  AssetList: {
    title: null,
    closeable: false,
    titleSize: '16px',
    padding: '12px 20px',
  },
  Default: {
    title: undefined,
    closeable: true,
    titleSize: '16px',
    padding: '20px 20px 24px',
  },
  Approval: {
    closeable: false,
    titleSize: '16px',
    maskClosable: false,
    padding: '20px',
  },
  CancelApproval: {
    padding: '8px 20px 22px',
    titleSize: '20px',
    closeable: true,
  },
  CancelConnect: {
    padding: '8px 20px 22px',
    titleSize: '20px',
    closeable: true,
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
    >
      {componentName === 'Approval' && <Approval className="h-full" />}
      {componentName === 'WalletConnect' && <ReconnectView />}
      {componentName === 'SwitchAddress' && <SwitchAddress />}
      {componentName === 'SwitchChain' && <SwitchChain />}
      {componentName === 'Ledger' && <Ledger />}
      {componentName === 'Keystone' && <Keystone />}
      {componentName === 'AssetList' && <AssetList visible={visible} />}
      {componentName === 'CancelApproval' && <CancelApproval />}
      {componentName === 'CancelConnect' && <CancelConnect />}
    </Popup>
  );
};
