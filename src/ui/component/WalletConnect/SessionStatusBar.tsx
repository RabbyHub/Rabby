import React from 'react';
import { SessionSignal } from './SessionSignal';
import { useSessionStatus } from './useSessionStatus';
import { useWallet, useCommonPopupView } from '@/ui/utils';
import { useDisplayBrandName } from './useDisplayBrandName';
import { message } from 'antd';
import { CommonStatusBar } from '../ConnectStatus/CommonStatusBar';

interface Props {
  address: string;
  brandName: string;
  className?: string;
}

export const SessionStatusBar: React.FC<Props> = ({
  address,
  brandName,
  className,
}) => {
  const { status } = useSessionStatus(
    {
      address,
      brandName,
    },
    true
  );
  const { activePopup, setAccount } = useCommonPopupView();
  const wallet = useWallet();
  const [displayBrandName, realBrandName] = useDisplayBrandName(
    brandName,
    address
  );

  const tipStatus = React.useMemo(() => {
    switch (status) {
      case 'ACCOUNT_ERROR':
        return 'ACCOUNT_ERROR';
      case undefined:
      case 'DISCONNECTED':
      case 'RECEIVED':
      case 'REJECTED':
      case 'BRAND_NAME_ERROR':
        return 'DISCONNECTED';

      default:
        return 'CONNECTED';
    }
  }, [status]);

  const handleButton = () => {
    setAccount({
      address,
      brandName,
      realBrandName,
    });
    if (tipStatus === 'CONNECTED') {
      wallet.killWalletConnectConnector(address, brandName, true);
      message.success('Disconnected');
    } else if (tipStatus === 'DISCONNECTED') {
      wallet.killWalletConnectConnector(address, brandName, true, true);
      activePopup('WalletConnect');
    } else if (tipStatus === 'ACCOUNT_ERROR') {
      activePopup('SwitchAddress');
    }
  };

  const TipContent = () => {
    switch (tipStatus) {
      case 'ACCOUNT_ERROR':
        return (
          <>
            <div>Connected but unable to sign.</div>
            <div>Please switch to the correct address in mobile wallet</div>
          </>
        );

      case 'DISCONNECTED':
        return <div>Not connected to {displayBrandName}</div>;

      default:
        return <div>Connected to {displayBrandName}</div>;
    }
  };

  return (
    <CommonStatusBar
      Signal={
        <SessionSignal
          size="small"
          address={address}
          brandName={brandName}
          className="mt-[7px]"
          pendingConnect={true}
        />
      }
      className={className}
      onClickButton={handleButton}
      ButtonText={
        <>
          {tipStatus === 'CONNECTED' && 'Disconnect'}
          {tipStatus === 'DISCONNECTED' && 'Connect'}
          {tipStatus === 'ACCOUNT_ERROR' && 'How to switch'}
        </>
      }
      Content={<TipContent />}
    />
  );
};
