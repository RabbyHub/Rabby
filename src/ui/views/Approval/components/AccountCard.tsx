import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRING_TYPE, HARDWARE_KEYRING_TYPES } from 'consts';
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
  const currentAccount = wallet.syncGetCurrentAccount();

  const getAccountIcon = (type: string) => {
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

  if (!currentAccount) return <></>;

  const icon = getAccountIcon(currentAccount.type);
  const [balance] = useCurrentBalance(currentAccount.address);

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
