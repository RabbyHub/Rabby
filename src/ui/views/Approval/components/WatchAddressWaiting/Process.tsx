import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from 'background/service/preference';
import {
  CHAINS_ENUM,
  WALLETCONNECT_STATUS_MAP,
  WALLET_BRAND_CONTENT,
} from 'consts';
import { useCommonPopupView } from 'ui/utils';
import {
  WALLET_BRAND_NAME_KEY,
  useDisplayBrandName,
} from '@/ui/component/WalletConnect/useDisplayBrandName';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { useInterval } from 'react-use';
import {
  ApprovalPopupContainer,
  Props as ApprovalPopupContainerProps,
} from '../Popup/ApprovalPopupContainer';
import { NetworkStatus } from './NetworkStatus';

type Valueof<T> = T[keyof T];

const Process = ({
  status,
  account,
  error,
  onRetry,
  onCancel,
  onDone,
  chain,
}: {
  chain: CHAINS_ENUM;
  result: string;
  status: Valueof<typeof WALLETCONNECT_STATUS_MAP>;
  account: Account;
  error: { code?: number; message?: string } | null;
  onRetry(): void;
  onCancel(): void;
  onDone(): void;
}) => {
  const { setClassName, setTitle: setPopupViewTitle } = useCommonPopupView();
  const [displayBrandName] = useDisplayBrandName(account.brandName);
  const brandRealUrl = useWalletConnectIcon(account);
  const { t } = useTranslation();
  const brandUrl = React.useMemo(() => {
    return (
      brandRealUrl ||
      WALLET_BRAND_CONTENT[displayBrandName]?.icon ||
      WALLET_BRAND_CONTENT[WALLET_BRAND_NAME_KEY[displayBrandName]]?.icon ||
      WALLET_BRAND_CONTENT.WALLETCONNECT.icon
    );
  }, [brandRealUrl]);
  const [sendingCounter, setSendingCounter] = React.useState(5);
  const [content, setContent] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [statusProp, setStatusProp] = React.useState<
    ApprovalPopupContainerProps['status']
  >('SENDING');

  const handleRetry = () => {
    onRetry();
    setSendingCounter(5);
  };
  const handleCancel = () => {
    onCancel();
  };

  useInterval(() => {
    setSendingCounter((prev) => prev - 1);
  }, 1000);

  const mergedStatus = React.useMemo(() => {
    if (sendingCounter <= 0 && status === WALLETCONNECT_STATUS_MAP.CONNECTED) {
      return WALLETCONNECT_STATUS_MAP.FAILED;
    }
    return status;
  }, [status, sendingCounter]);

  React.useEffect(() => {
    setPopupViewTitle(
      <div className="flex justify-center items-center">
        <img src={brandUrl} className="w-20 mr-8" />
        <span>
          {t('page.signFooterBar.qrcode.signWith', { brand: displayBrandName })}
        </span>
      </div>
    );
  }, [displayBrandName]);

  const init = async () => {
    setClassName(undefined);
  };

  React.useEffect(() => {
    switch (mergedStatus) {
      case WALLETCONNECT_STATUS_MAP.CONNECTED:
        setContent(t('page.signFooterBar.walletConnect.sendingRequest'));
        setDescription('');
        setStatusProp('SENDING');
        break;
      case WALLETCONNECT_STATUS_MAP.WAITING:
        setContent(t('page.signFooterBar.walletConnect.sendingRequest'));
        setDescription(
          t('page.signFooterBar.walletConnect.signOnYourMobileWallet')
        );
        setStatusProp('WAITING');
        break;
      case WALLETCONNECT_STATUS_MAP.FAILED:
        setContent(t('page.signFooterBar.walletConnect.requestFailedToSend'));
        setDescription('');
        setStatusProp('FAILED');
        break;
      case WALLETCONNECT_STATUS_MAP.SUBMITTED:
        setContent(t('page.signFooterBar.qrcode.sigCompleted'));
        setDescription('');
        setStatusProp('RESOLVED');
        break;
      case WALLETCONNECT_STATUS_MAP.REJECTED:
        setContent(t('page.signFooterBar.ledger.txRejected'));
        setDescription('');
        setStatusProp('REJECTED');
        break;
    }
  }, [mergedStatus, error]);

  React.useEffect(() => {
    init();
  }, []);

  return (
    <ApprovalPopupContainer
      hdType="walletconnect"
      showAnimation
      status={statusProp}
      onRetry={handleRetry}
      onDone={onDone}
      onCancel={handleCancel}
      description={description}
      content={
        <>
          {content}
          {mergedStatus === WALLETCONNECT_STATUS_MAP.CONNECTED && (
            <span>({sendingCounter}s)</span>
          )}
        </>
      }
    >
      <NetworkStatus
        account={account}
        className="absolute left-[-12px] bottom-[-16px]"
      />
    </ApprovalPopupContainer>
  );
};

export default Process;
