import { Popup } from '@/ui/component';
import { useCommonPopupView } from '@/ui/utils';
import React from 'react';
import Approval from '../Approval';
import { ReconnectView } from '@/ui/component/WalletConnect/ReconnectView';
import { SwitchAddress } from './SwitchAddress';
import { SwitchChain } from './SwitchChain';
import { Ledger } from './Ledger';

export type CommonPopupComponentName =
  | 'Approval'
  | 'WalletConnect'
  | 'SwitchAddress'
  | 'SwitchChain'
  | 'Ledger';

export const CommonPopup: React.FC = () => {
  const {
    visible,
    setVisible,
    title,
    height,
    className,
    componentName,
  } = useCommonPopupView();

  return (
    <Popup
      title={<span className="text-[16px]">{title}</span>}
      closable
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
    </Popup>
  );
};
