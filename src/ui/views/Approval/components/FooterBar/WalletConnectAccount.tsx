import { Account } from '@/background/service/preference';
import { KEYRINGS_LOGOS, WALLET_BRAND_CONTENT } from '@/constant';
import { SessionSignal } from '@/ui/component/WalletConnect/SessionSignal';
import { useDisplayBrandName } from '@/ui/component/WalletConnect/useDisplayBrandName';
import { useSessionChainId } from '@/ui/component/WalletConnect/useSessionChainId';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { Chain } from '@debank/common';
import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CommonAccount } from './CommonAccount';

export interface Props {
  account: Account;
  chain?: Chain;
}

export const WalletConnectAccount: React.FC<Props> = ({ account, chain }) => {
  const { activePopup, setAccount, setVisible } = useCommonPopupView();
  const { t } = useTranslation();
  const { address, brandName, type } = account;
  const brandIcon = useWalletConnectIcon({
    address,
    brandName,
    type,
  });
  const addressTypeIcon = React.useMemo(
    () =>
      brandIcon ||
      WALLET_BRAND_CONTENT?.[brandName]?.image ||
      KEYRINGS_LOGOS[type],
    [type, brandName, brandIcon]
  );
  const [displayBrandName, realBrandName] = useDisplayBrandName(
    brandName,
    address
  );
  const { status } = useSessionStatus(
    {
      address,
      brandName,
    },
    true
  );
  const sessionChainId = useSessionChainId({
    address,
    brandName,
  });

  const tipStatus = React.useMemo(() => {
    // if (chain && chain.id !== sessionChainId && status === 'CONNECTED') {
    //   return 'CHAIN_ERROR';
    // }
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
  }, [status, sessionChainId, chain]);

  const wallet = useWallet();
  React.useEffect(() => {
    if (chain && sessionChainId && chain.id !== sessionChainId) {
      wallet.walletConnectSwitchChain(account, chain.id);
    }
  }, [sessionChainId, chain]);

  const TipContent = () => {
    switch (tipStatus) {
      case 'ACCOUNT_ERROR':
        return (
          <div className="text-orange">
            <div>
              {t('page.signFooterBar.walletConnect.connectedButCantSign')}
            </div>
            <div className="whitespace-nowrap mt-8">
              {t('page.signFooterBar.walletConnect.switchToCorrectAddress')}
            </div>
          </div>
        );
      // case 'CHAIN_ERROR':
      //   return (
      //     <div className="text-orange">
      //       <div>
      //         {t('page.signFooterBar.walletConnect.connectedButCantSign')}
      //       </div>
      //       <div className="mt-8">
      //         {t('page.signFooterBar.walletConnect.switchChainAlert', {
      //           chain: chain?.name,
      //         })}
      //       </div>
      //     </div>
      //   );
      case 'DISCONNECTED':
        return (
          <div>
            {t('page.signFooterBar.walletConnect.notConnectToMobile', {
              brand: displayBrandName,
            })}
          </div>
        );

      default:
        return (
          <div className="text-black">
            {t('page.signFooterBar.walletConnect.connected')}
          </div>
        );
    }
  };

  const handleButton = () => {
    setAccount({
      address,
      brandName,
      realBrandName,
      chainId: chain?.id,
      type,
    });
    if (tipStatus === 'DISCONNECTED') {
      activePopup('WalletConnect');
    } else if (tipStatus === 'ACCOUNT_ERROR') {
      activePopup('SwitchAddress');
    }
    // else if (tipStatus === 'CHAIN_ERROR') {
    //   activePopup('SwitchChain');
    // }
  };

  React.useEffect(() => {
    if (
      tipStatus === 'ACCOUNT_ERROR'
      // || tipStatus === 'CHAIN_ERROR'
    ) {
      setVisible(false);
    }
  }, [tipStatus]);

  return (
    <CommonAccount
      customSignal={
        <SessionSignal
          chainId={chain?.id}
          pendingConnect={true}
          isBadge
          address={address}
          brandName={brandName}
        />
      }
      tip={<TipContent />}
      icon={addressTypeIcon}
      footer={
        tipStatus === 'DISCONNECTED' && (
          <Button
            onClick={handleButton}
            className="w-full h-[40px] mt-[12px]"
            type="primary"
          >
            {t('page.signFooterBar.connectButton')}
          </Button>
        )
      }
    >
      <div
        onClick={handleButton}
        className={clsx(
          'underline cursor-pointer',
          'absolute right-0 top-[-1px]',
          'text-12 leading-[20px] font-medium text-r-neutral-body'
        )}
      >
        {tipStatus === 'ACCOUNT_ERROR' &&
          t('page.signFooterBar.walletConnect.howToSwitch')}
        {/* {tipStatus === 'CHAIN_ERROR' &&
          t('page.signFooterBar.walletConnect.howToSwitch')} */}
      </div>
    </CommonAccount>
  );
};
