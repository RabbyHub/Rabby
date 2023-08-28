import React, { useState, useEffect } from 'react';
import { Drawer, Button } from 'antd';
import BN from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import FieldCheckbox from 'ui/component/FieldCheckbox';
import AddressViewer from 'ui/component/AddressViewer';
import { Account } from 'background/service/preference';
import { useWallet, isSameAddress, formatTokenAmount } from 'ui/utils';
import {
  KEYRING_TYPE,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  CHAINS,
} from 'consts';
import './style.less';
import { CommonSignal } from '../ConnectStatus/CommonSignal';
import { useWalletConnectIcon } from '../WalletConnect/useWalletConnectIcon';

interface AccountSelectDrawerProps {
  onChange(account: Account): void;
  onCancel(): void;
  title: string;
  visible: boolean;
  isLoading?: boolean;
  networkId: string;
}

interface AccountItemProps {
  account: Account;
  checked: boolean;
  onSelect(account: Account): void;
  networkId: string;
}

export const AccountItem = ({
  account,
  onSelect,
  checked,
  networkId,
}: AccountItemProps) => {
  const [alianName, setAlianName] = useState('');
  const [nativeTokenBalance, setNativeTokenBalance] = useState<null | string>(
    null
  );
  const [nativeTokenSymbol, setNativeTokenSymbol] = useState('ETH');
  const wallet = useWallet();

  const init = async (networkId) => {
    const name = (await wallet.getAlianName(account.address))!;
    const chain = Object.values(CHAINS).find(
      (item) => item.id.toString() === networkId + ''
    )!;
    setNativeTokenSymbol(chain.nativeTokenSymbol);
    setAlianName(name);
  };

  const fetchNativeTokenBalance = async () => {
    const chain = Object.values(CHAINS).find(
      (item) => item.id.toString() === networkId + ''
    )!;
    const balanceInWei = await wallet.requestETHRpc(
      {
        method: 'eth_getBalance',
        params: [account.address, 'latest'],
      },
      chain.serverId
    );
    setNativeTokenBalance(new BN(balanceInWei).div(1e18).toFixed());
  };

  useEffect(() => {
    if (checked && nativeTokenBalance === null) {
      fetchNativeTokenBalance();
    }
  }, [checked]);

  useEffect(() => {
    init(networkId);
  }, [networkId]);

  const brandIcon = useWalletConnectIcon(account);

  return (
    <FieldCheckbox
      className="item"
      showCheckbox={!!account.type}
      onChange={(checked) => checked && onSelect(account)}
      checked={checked}
    >
      <div className="icon icon-keyring relative">
        <img
          width={24}
          height={24}
          src={
            brandIcon ||
            WALLET_BRAND_CONTENT[account.brandName]?.image ||
            KEYRING_ICONS[account.type]
          }
        />
        <CommonSignal
          type={account.type}
          brandName={account.brandName}
          address={account.address}
          className="bottom-[2px] right-0"
        />
      </div>
      <div className="flex w-full item-container">
        <div>
          <p className="alian-name">{alianName}</p>
          <AddressViewer address={account.address} showArrow={false} />
        </div>
        <div className="text-12 text-gray-light native-token-balance">
          {nativeTokenBalance !== null &&
            `${formatTokenAmount(nativeTokenBalance)} ${nativeTokenSymbol}`}
        </div>
      </div>
    </FieldCheckbox>
  );
};

const AccountSelectDrawer = ({
  onChange,
  title,
  onCancel,
  visible,
  isLoading = false,
  networkId,
}: AccountSelectDrawerProps) => {
  const [checkedAccount, setCheckedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { t } = useTranslation();
  const wallet = useWallet();

  const init = async () => {
    const visibleAccounts: Account[] = await wallet.getAllVisibleAccountsArray();
    const watches: Account[] = [];
    const others: Account[] = [];
    for (let i = 0; i < visibleAccounts.length; i++) {
      const account = visibleAccounts[i];
      if (account.type !== KEYRING_TYPE.GnosisKeyring) {
        if (account.type === KEYRING_TYPE.WatchAddressKeyring) {
          watches.push(account);
        } else {
          others.push(account);
        }
      }
    }
    setAccounts([...others, ...watches]);
  };

  const handleSelectAccount = (account: Account) => {
    setCheckedAccount(account);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <Drawer
      height={440}
      className="account-select"
      visible={visible}
      placement="bottom"
      maskClosable
      onClose={onCancel}
    >
      <div className="title">{title}</div>
      <div className="list">
        {accounts.map((account) => (
          <AccountItem
            account={account}
            onSelect={handleSelectAccount}
            networkId={networkId}
            checked={
              checkedAccount
                ? isSameAddress(account.address, checkedAccount.address) &&
                  checkedAccount.brandName === account.brandName
                : false
            }
          />
        ))}
      </div>
      <div className="footer">
        <Button type="primary" onClick={onCancel}>
          {t('component.AccountSelectDrawer.btn.cancel')}
        </Button>
        <Button
          type="primary"
          onClick={() => checkedAccount && onChange(checkedAccount)}
          disabled={!checkedAccount}
          loading={isLoading}
        >
          {t('component.AccountSelectDrawer.btn.proceed')}
        </Button>
      </div>
    </Drawer>
  );
};

export default AccountSelectDrawer;
