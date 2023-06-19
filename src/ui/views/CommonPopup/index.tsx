import { Popup } from '@/ui/component';
import { useCommonPopupView } from '@/ui/utils';
import React from 'react';
import Approval from '../Approval';
import { ReconnectView } from '@/ui/component/WalletConnect/ReconnectView';
import { SwitchAddress } from './SwitchAddress';
import { SwitchChain } from './SwitchChain';
import { Ledger } from './Ledger';
import { AssetList } from './AssetList/AssetList';

export type CommonPopupComponentName =
  | 'Approval'
  | 'WalletConnect'
  | 'SwitchAddress'
  | 'SwitchChain'
  | 'AssetList'
  | 'Ledger';

const ComponentConfig = {
  AssetList: {
    title: null,
    closeable: false,
  },
  Default: {
    title: undefined,
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
      title={<span className="text-[16px]">{config.title}</span>}
      closable={config.closeable}
      height={height}
      onClose={() => setVisible(false)}
      visible={visible && !!componentName}
      className={className}
      destroyOnClose={false}
    >
      {componentName === 'Approval' && <Approval className="h-full" />}
      {componentName === 'WalletConnect' && <ReconnectView />}
      {componentName === 'SwitchAddress' && <SwitchAddress />}
      {componentName === 'SwitchChain' && <SwitchChain />}
      {componentName === 'Ledger' && <Ledger />}
      {componentName === 'AssetList' && <AssetList />}
    </Popup>
  );
};
