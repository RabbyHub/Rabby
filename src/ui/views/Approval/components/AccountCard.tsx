import React, { useState, useEffect } from 'react';
import { Account } from 'background/service/preference';
import { useWallet } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRINGS_LOGOS, WALLET_BRAND_CONTENT, KEYRING_CLASS } from 'consts';
import { AddressViewer } from 'ui/component';
import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';
import clsx from 'clsx';

const AccountCard = ({
  icons,
  alianName,
  account,
}: {
  icons?: {
    mnemonic: string;
    privatekey: string;
    watch: string;
  };
  alianName?: string | null;
  account?: Account;
}) => {
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(
    account || null
  );
  const [currentAccountAlianName, setCurrentAccountAlianName] = useState('');
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
    const currentAccount = account || (await wallet.syncGetCurrentAccount());
    setCurrentAccount(currentAccount);
    const alianName = await wallet.getAlianName(
      currentAccount?.address?.toLowerCase()
    );
    setCurrentAccountAlianName(alianName);
  };

  useEffect(() => {
    init();
  }, []);

  const [balance] = useCurrentBalance(currentAccount?.address);
  const icon = getAccountIcon(currentAccount?.type);

  if (!currentAccount) return <></>;
  return (
    <div className={clsx('account-card', alianName && 'h-[48px]')}>
      <div className={clsx('account-detail', alianName && 'h-[48px]')}>
        <img src={icon} className="icon icon-account" />
        {(alianName || currentAccountAlianName) && (
          <div className="flex flex-col">
            <div className={clsx('send-text', !alianName && 'text-white')}>
              {alianName || currentAccountAlianName}
            </div>
            <AddressViewer
              showArrow={false}
              address={currentAccount.address}
              className={clsx(
                'text-12 opacity-60',
                alianName ? 'opacity-80 send-viewer' : 'text-white'
              )}
            />
          </div>
        )}
        <span className="amount">
          ${splitNumberByStep((balance || 0).toFixed(2))}
        </span>
      </div>
    </div>
  );
};

export default AccountCard;
