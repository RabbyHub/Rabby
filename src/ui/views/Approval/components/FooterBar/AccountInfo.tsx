import { Account } from '@/background/service/preference';
import {
  KEYRING_ICONS,
  KEYRING_CLASS,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import { AddressViewer } from '@/ui/component';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { splitNumberByStep, useWallet } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { WalletConnectAccount } from './WalletConnectAccount';
import { Chain } from '@debank/common';
import { LedgerAccount } from './LedgerAccount';
import { CommonAccount } from './CommonAccount';
import { KeystoneAccount } from './KeystoneAccount';
import { GridPlusAccount } from './GridPlusAccount';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

export interface Props {
  account: Account;
  isTestnet?: boolean;
  chain?: Chain;
}

export const AccountInfo: React.FC<Props> = ({
  account,
  chain,
  isTestnet = false,
}) => {
  const [nickname, setNickname] = React.useState<string>();
  const [balance] = useCurrentBalance(account?.address);
  const displayBalance = splitNumberByStep((balance || 0).toFixed(2));
  const wallet = useWallet();
  const { t } = useTranslation();

  const init = async () => {
    const result = await wallet.getAlianName(
      account?.address?.toLowerCase() || ''
    );
    setNickname(result);
    checkIfNeedPassphrase();
  };

  const [needPassphrase, setNeedPassphrase] = React.useState(false);
  const checkIfNeedPassphrase = () => {
    if (account?.type === KEYRING_CLASS.MNEMONIC && account?.address) {
      wallet
        .getMnemonicKeyringIfNeedPassphrase('address', account.address)
        .then((result) => {
          setNeedPassphrase(result);
        });
    }
  };

  React.useEffect(() => {
    init();
  }, [account]);

  return (
    <div
      className={clsx(
        'bg-r-neutral-card-3 rounded-[8px]',
        'py-[12px] px-[12px] mb-[12px]',
        'space-y-10'
      )}
    >
      <div className={clsx('flex items-center justify-between', 'h-18')}>
        <div className="space-x-6 flex items-center">
          <Tooltip title={nickname}>
            <div
              className={clsx(
                'text-gray-subTitle text-[15px]',
                'max-w-[170px] overflow-ellipsis whitespace-nowrap overflow-hidden',
                'leading-[20px]'
              )}
            >
              {nickname}
            </div>
          </Tooltip>
          <AddressViewer
            showArrow={false}
            address={account.address}
            className={clsx('text-13 text-black mt-[2px]')}
          />
        </div>
        {isTestnet ? null : (
          <div
            className="text-13 font-medium text-black mt-[4px]"
            title={displayBalance}
          >
            ${displayBalance}
          </div>
        )}
      </div>
      {account?.type === KEYRING_CLASS.WALLETCONNECT && (
        <WalletConnectAccount chain={chain} account={account} />
      )}
      {account?.type === KEYRING_CLASS.HARDWARE.LEDGER && <LedgerAccount />}
      {account?.type === KEYRING_CLASS.HARDWARE.GRIDPLUS && <GridPlusAccount />}
      {account?.type === KEYRING_CLASS.HARDWARE.ONEKEY && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.ONEKEY.icon}
          tip={t('page.signFooterBar.addressTip.onekey')}
        />
      )}
      {account?.type === KEYRING_CLASS.HARDWARE.TREZOR && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.TREZOR.icon}
          tip={t('page.signFooterBar.addressTip.trezor')}
        />
      )}
      {account?.type === KEYRING_CLASS.HARDWARE.BITBOX02 && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.BITBOX02.icon}
          tip={t('page.signFooterBar.addressTip.bitbox')}
        />
      )}
      {account?.brandName === WALLET_BRAND_TYPES.KEYSTONE && (
        <KeystoneAccount />
      )}
      {account?.brandName === WALLET_BRAND_TYPES.AIRGAP && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.AirGap.icon}
          tip={t('page.signFooterBar.addressTip.airgap')}
        />
      )}
      {account?.brandName === WALLET_BRAND_TYPES.COOLWALLET && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.CoolWallet.icon}
          tip={t('page.signFooterBar.addressTip.coolwallet')}
        />
      )}
      {account?.type === KEYRING_CLASS.PRIVATE_KEY && (
        <CommonAccount
          icon={KEYRING_ICONS[KEYRING_CLASS.PRIVATE_KEY]}
          tip={t('page.signFooterBar.addressTip.privateKey')}
        />
      )}
      {account?.type === KEYRING_CLASS.MNEMONIC && (
        <CommonAccount
          icon={KEYRING_ICONS[KEYRING_CLASS.MNEMONIC]}
          tip={
            needPassphrase
              ? t('page.signFooterBar.addressTip.seedPhraseWithPassphrase')
              : t('page.signFooterBar.addressTip.seedPhrase')
          }
        />
      )}
      {account?.type === KEYRING_CLASS.WATCH && (
        <CommonAccount
          icon={KEYRING_ICONS[KEYRING_CLASS.WATCH]}
          tip={t('page.signFooterBar.addressTip.watchAddress')}
        />
      )}
      {account?.type === KEYRING_CLASS.GNOSIS && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.Gnosis.icon}
          tip={t('page.signFooterBar.addressTip.safe')}
        />
      )}
      {account?.type === KEYRING_CLASS.CoboArgus && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.CoboArgus.icon}
          tip={t('page.signFooterBar.addressTip.coboSafe')}
        />
      )}
      {account?.type === KEYRING_CLASS.Coinbase && (
        <WalletConnectAccount chain={chain} account={account} />
      )}
    </div>
  );
};
