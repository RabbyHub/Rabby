import React from 'react';
import { SessionSignal } from './SessionSignal';
import clsx from 'clsx';
import { useSessionStatus } from './useSessionStatus';
import { useWallet, useCommonPopupView } from '@/ui/utils';
import { useDisplayBrandName } from './useDisplayBrandName';
import { message } from 'antd';

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
  const [pendingConnect, setPendingConnect] = React.useState(false);
  const { status } = useSessionStatus(
    {
      address,
      brandName,
    },
    pendingConnect
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
      activePopup('WalletConnect');
      setPendingConnect(true);
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

  React.useEffect(() => {
    if (status === 'CONNECTED') {
      setPendingConnect(false);
    }
  }, [status]);

  return (
    <div
      className={clsx(
        'relative',
        'py-[6px] pl-[8px] pr-[6px] rounded-[4px]',
        'flex flex-row items-center justify-between',
        'text-[13px]',
        className
      )}
    >
      <div className="flex flex-row items-start">
        <SessionSignal
          size="small"
          address={address}
          brandName={brandName}
          className="mt-[7px]"
          pendingConnect={pendingConnect}
        />
        <div className={clsx('ml-[4px]')}>
          <TipContent />
        </div>
      </div>
      <div
        onClick={handleButton}
        className={clsx(
          'underline cursor-pointer',
          'absolute right-[8px] top-[6px]'
        )}
      >
        {tipStatus === 'CONNECTED' && 'Disconnect'}
        {tipStatus === 'DISCONNECTED' && 'Connect'}
        {tipStatus === 'ACCOUNT_ERROR' && 'How to switch'}
      </div>
    </div>
  );
};
