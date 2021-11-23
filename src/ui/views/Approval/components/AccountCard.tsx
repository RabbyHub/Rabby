import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from 'background/service/preference';
import { useWallet } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRINGS_LOGOS, WALLET_BRAND_CONTENT, KEYRING_CLASS } from 'consts';
import { AddressViewer } from 'ui/component';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';

const AccountCard = ({
  icons,
}: {
  icons?: {
    mnemonic: string;
    privatekey: string;
    watch: string;
  };
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const getAccountIcon = (type: string | undefined) => {
    if (currentAccount && type) {
      if (WALLET_BRAND_CONTENT[currentAccount?.brandName]) {
        return WALLET_BRAND_CONTENT[currentAccount?.brandName].image;
      }

      if (icons) {
        switch (type) {
          case KEYRING_CLASS.MNEMONIC:
            return icons.mnemonic;
          case KEYRING_CLASS.PRIVATE_KEY:
            return icons.privatekey;
          case KEYRING_CLASS.WATCH:
            return icons.watch;
        }
      }

      return KEYRINGS_LOGOS[type];
    }
    return '';
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
      <div className="account-detail">
        <img src={icon} className="icon icon-account" />
        <AddressViewer
          showArrow={false}
          address={currentAccount.address}
          brandName={currentAccount.brandName}
        />
        <span className="amount">
          ${splitNumberByStep((balance || 0).toFixed(2))}
        </span>
      </div>
    </div>
  );
};

export default AccountCard;
