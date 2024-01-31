import React, { useState, useEffect } from 'react';
import { Account } from 'background/service/preference';
import { useWallet } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRINGS_LOGOS, WALLET_BRAND_CONTENT, KEYRING_CLASS } from 'consts';
import { AddressViewer } from 'ui/component';
import useCurrentBalance from 'ui/hooks/useCurrentBalance';
import clsx from 'clsx';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { pickKeyringThemeIcon } from '@/utils/account';
import { useThemeMode } from '@/ui/hooks/usePreference';

const AccountCard = ({
  icons,
  alianName,
  account,
  isHideAmount,
}: {
  icons?: {
    mnemonic: string;
    privatekey: string;
    watch: string;
  };
  alianName?: string | null;
  account?: Account;
  isHideAmount?: boolean;
}) => {
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(
    account || null
  );
  const [currentAccountAlianName, setCurrentAccountAlianName] = useState('');
  const brandRealUrl = useWalletConnectIcon(currentAccount);
  const { isDarkTheme } = useThemeMode();
  const getAccountIcon = React.useCallback(
    (type: string | undefined) => {
      if (brandRealUrl) {
        return brandRealUrl;
      }
      if (currentAccount && type) {
        const icon = pickKeyringThemeIcon(currentAccount?.brandName as any, {
          needLightVersion: isDarkTheme,
        });
        if (icon) return icon;

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
    },
    [currentAccount, icons, isDarkTheme]
  );

  const init = async () => {
    const currentAccount = account || (await wallet.syncGetCurrentAccount());
    setCurrentAccount(currentAccount || null);
    const alianName = await wallet.getAlianName(
      currentAccount?.address?.toLowerCase() || ''
    );
    setCurrentAccountAlianName(alianName || '');
  };

  useEffect(() => {
    init();
  }, []);

  const { balance } = useCurrentBalance(currentAccount?.address);

  if (!currentAccount) return <></>;

  const icon = getAccountIcon(currentAccount?.type);

  return (
    <div className={clsx('account-card', alianName && 'h-[48px]')}>
      <div className={clsx('account-detail', alianName && 'h-[48px]')}>
        <img src={icon} className="icon icon-account" />
        {(alianName || currentAccountAlianName) && (
          <div className="flex flex-col">
            <div
              className={clsx('send-text', !alianName && 'text-white')}
              title={alianName || currentAccountAlianName}
            >
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
        {!isHideAmount ? (
          <span
            className="amount truncate"
            title={splitNumberByStep((balance || 0).toFixed(2))}
          >
            ${splitNumberByStep((balance || 0).toFixed(2))}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default AccountCard;
