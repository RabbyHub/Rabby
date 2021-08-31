import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import IconRabbyWhite from 'ui/assets/rabby-white.svg';

const DefaultWalletAlertBar = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const handleConfirm = () => {
    wallet.setDefaultWallet();
  };

  return (
    <div className="default-wallet-alert">
      <img src={IconRabbyWhite} className="icon icon-rabby-white" />
      <span>{t('SetDefaultWalletAlert')}</span>
      <a href="javascript:;" className="confirm-btn" onClick={handleConfirm}>
        {t('Confirm')}
      </a>
    </div>
  );
};

export default DefaultWalletAlertBar;
