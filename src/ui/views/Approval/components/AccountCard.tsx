import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from 'background/service/preference';
import { useWallet } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import {
  KEYRING_TYPE,
  HARDWARE_KEYRING_TYPES,
  WALLET_BRAND_CONTENT,
} from 'consts';
import { AddressViewer } from 'ui/component';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import IconNormal from 'ui/assets/keyring-normal.svg';
import IconHardware from 'ui/assets/hardware-white.svg';
import IconWatch from 'ui/assets/watch-white.svg';

const AccountCard = ({
  icons,
}: {
  icons?: {
    normal: string;
    hardware: string;
    watch: string;
  };
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const getAccountIcon = (type: string | undefined) => {
    if (currentAccount && WALLET_BRAND_CONTENT[currentAccount?.brandName]) {
      return WALLET_BRAND_CONTENT[currentAccount?.brandName].image;
    }
    switch (type) {
      case HARDWARE_KEYRING_TYPES.Ledger.type:
      case HARDWARE_KEYRING_TYPES.Trezor.type:
      case HARDWARE_KEYRING_TYPES.Onekey.type:
        return icons?.hardware || IconHardware;
      case KEYRING_TYPE.HdKeyring:
      case KEYRING_TYPE.SimpleKeyring:
        return icons?.normal || IconNormal;
      case KEYRING_TYPE.WatchAddressKeyring:
        return icons?.watch || IconWatch;
      default:
        return icons?.normal || IconNormal;
    }
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    setCurrentAccount(account);
  };

  useEffect(() => {
    init();
  }, []);

  const [balance] = useCurrentBalance(currentAccount?.address);
  const icon = getAccountIcon(currentAccount?.type);

  if (!currentAccount) return <></>;

  return (
    <div className="account-card">
      <p className="title">{t('Current account')}</p>
      <div className="account-detail">
        <img src={icon} className="icon icon-account" />
        <AddressViewer showArrow={false} address={currentAccount.address} />
        <span className="amount">
          ${splitNumberByStep((balance || 0).toFixed(2))}
        </span>
      </div>
    </div>
  );
};

export default AccountCard;
