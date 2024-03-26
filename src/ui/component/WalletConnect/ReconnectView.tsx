import { EVENTS, KEYRING_CLASS } from '@/constant';
import eventBus from '@/eventBus';
import { noop, useCommonPopupView, useWallet } from '@/ui/utils';
import React from 'react';
import { Account } from 'background/service/preference';
import Scan from '@/ui/views/Approval/components/WatchAddressWaiting/Scan';
import { useSessionStatus } from './useSessionStatus';
import { useDisplayBrandName } from './useDisplayBrandName';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

export const ReconnectView: React.FC = () => {
  const wallet = useWallet();
  const {
    setTitle: setPopupViewTitle,
    setHeight,
    setClassName,
    closePopup,
    visible,
    account,
  } = useCommonPopupView();
  const [qrCodeContent, setQRcodeContent] = React.useState('');
  const [currentAccount, setCurrentAccount] = React.useState<Account | null>(
    null
  );
  const { status, errorAccount } = useSessionStatus(account);
  const [displayBrandName] = useDisplayBrandName(
    account?.realBrandName || account?.brandName
  );

  const initWalletConnect = async () => {
    if (account && ['CONNECTED', 'DISCONNECTED'].includes(status as string)) {
      await wallet.killWalletConnectConnector(
        account.address,
        account.brandName,
        false,
        true
      );
    }
    eventBus.emit(EVENTS.broadcastToBackground, {
      method: EVENTS.WALLETCONNECT.INIT,
      data: account,
    });
  };

  const handleRefreshQrCode = () => {
    initWalletConnect();
  };
  const { t } = useTranslation();

  const init = React.useCallback(async () => {
    if (!account) return;
    setCurrentAccount({
      ...account,
      brandName: account.realBrandName || account.brandName,
      type: KEYRING_CLASS.WALLETCONNECT,
    });
    setPopupViewTitle(
      t('page.newAddress.walletConnect.title', { brandName: displayBrandName })
    );
    setHeight(420);
    setClassName('isConnectView');
  }, [account, displayBrandName]);

  React.useEffect(() => {
    init();
  }, [init]);

  React.useEffect(() => {
    if (visible) {
      initWalletConnect();
    } else {
      setQRcodeContent('');
    }
  }, [visible]);

  React.useEffect(() => {
    const handleInit = ({ uri }) => {
      setQRcodeContent(uri);
    };
    eventBus.addEventListener(EVENTS.WALLETCONNECT.INITED, handleInit);

    return () => {
      eventBus.removeEventListener(EVENTS.WALLETCONNECT.INITED, handleInit);
    };
  }, []);

  React.useEffect(() => {
    if (status === 'CONNECTED') {
      message.success({
        type: 'success',
        content: t('page.newAddress.walletConnect.status.connected'),
      });
      closePopup();
    } else if (account && errorAccount && status === 'ACCOUNT_ERROR') {
      wallet.killWalletConnectConnector(
        errorAccount.address,
        errorAccount.brandName,
        true,
        true
      );
    }
  }, [account, errorAccount, status]);

  return (
    <div className="watchaddress">
      {currentAccount && visible && (
        <Scan
          uri={qrCodeContent}
          onRefresh={handleRefreshQrCode}
          account={currentAccount}
        />
      )}
    </div>
  );
};
