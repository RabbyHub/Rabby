import React from 'react';
import { SessionSignal } from './SessionSignal';
import { useSessionStatus } from './useSessionStatus';
import { useWallet, useCommonPopupView } from '@/ui/utils';
import { useDisplayBrandName } from './useDisplayBrandName';
import { message } from 'antd';
import { CommonStatusBar } from '../ConnectStatus/CommonStatusBar';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();

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
      message.success(t('global.Disconnected'));
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
            <div>
              {t('component.WalletConnect.SessionStatusBar.tip.accountError1')}
            </div>
            <div>
              {t('component.WalletConnect.SessionStatusBar.tip.accountError2')}
            </div>
          </>
        );

      case 'DISCONNECTED':
        return (
          <div>
            {t('component.WalletConnect.SessionStatusBar.tip.disconnected', {
              displayBrandName,
            })}
          </div>
        );

      default:
        return (
          <div>
            {t('component.WalletConnect.SessionStatusBar.tip.connected', {
              displayBrandName,
            })}
          </div>
        );
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
          {tipStatus === 'CONNECTED' && t('global.Disconnect')}
          {tipStatus === 'DISCONNECTED' && t('global.Connect')}
          {tipStatus === 'ACCOUNT_ERROR' &&
            t('component.WalletConnect.SessionStatusBar.button.switchAddress')}
        </>
      }
      Content={<TipContent />}
    />
  );
};
