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
import { GridPlusAccount } from './GridPlusAccount';
import { Tooltip } from 'antd';

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

  const init = async () => {
    const result = await wallet.getAlianName(
      account?.address?.toLowerCase() || ''
    );
    setNickname(result);
  };

  React.useEffect(() => {
    init();
  }, [account]);

  return (
    <div
      className={clsx(
        'bg-[#F6F8FF] rounded-[8px]',
        'py-[12px] px-[12px] mb-[12px]',
        'space-y-10'
      )}
    >
      <div className={clsx('flex items-center justify-between')}>
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
            className={clsx('text-13 text-black mt-[4px]')}
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
          tip="OneKey address"
        />
      )}
      {account?.type === KEYRING_CLASS.HARDWARE.TREZOR && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.TREZOR.icon}
          tip="Trezor address"
        />
      )}
      {account?.type === KEYRING_CLASS.HARDWARE.BITBOX02 && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.BITBOX02.icon}
          tip="BitBox02 address"
        />
      )}
      {account?.brandName === WALLET_BRAND_TYPES.KEYSTONE && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.Keystone.icon}
          tip="Keystone address"
        />
      )}
      {account?.brandName === WALLET_BRAND_TYPES.AIRGAP && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.AirGap.icon}
          tip="AirGap address"
        />
      )}
      {account?.brandName === WALLET_BRAND_TYPES.COOLWALLET && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.CoolWallet.icon}
          tip="CoolWallet address"
        />
      )}
      {account?.type === KEYRING_CLASS.PRIVATE_KEY && (
        <CommonAccount
          icon={KEYRING_ICONS[KEYRING_CLASS.PRIVATE_KEY]}
          tip="Private Key address"
        />
      )}
      {account?.type === KEYRING_CLASS.MNEMONIC && (
        <CommonAccount
          icon={KEYRING_ICONS[KEYRING_CLASS.MNEMONIC]}
          tip="Seed Phrase address"
        />
      )}
      {account?.type === KEYRING_CLASS.WATCH && (
        <CommonAccount
          icon={KEYRING_ICONS[KEYRING_CLASS.WATCH]}
          tip="Unable to sign with watch-only address"
        />
      )}
      {account?.type === KEYRING_CLASS.GNOSIS && (
        <CommonAccount
          icon={WALLET_BRAND_CONTENT.Gnosis.icon}
          tip="Safe address"
        />
      )}
    </div>
  );
};
