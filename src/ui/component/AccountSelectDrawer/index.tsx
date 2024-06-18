import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Button } from 'antd';
import BN from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import FieldCheckbox from 'ui/component/FieldCheckbox';
import AddressViewer from 'ui/component/AddressViewer';
import { Account } from 'background/service/preference';
import { pickKeyringThemeIcon } from '@/utils/account';
import { useWallet, isSameAddress, formatTokenAmount } from 'ui/utils';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { KEYRING_TYPE, WALLET_BRAND_CONTENT, CHAINS } from 'consts';
import './style.less';
import { CommonSignal } from '../ConnectStatus/CommonSignal';
import { useWalletConnectIcon } from '../WalletConnect/useWalletConnectIcon';
import { findChain } from '@/utils/chain';
import { ReactComponent as RcIconEmpty } from '@/ui/assets/empty-cc.svg';

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

    const chain = findChain({
      id: +networkId,
    });
    if (!chain) {
      return;
    }
    setNativeTokenSymbol(chain.nativeTokenSymbol);
    setAlianName(name);
  };

  const fetchNativeTokenBalance = async () => {
    const chain = findChain({
      id: +networkId,
    });
    if (!chain) {
      return;
    }
    const balanceInWei = await wallet.requestETHRpc<any>(
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

  const { isDarkTheme } = useThemeMode();

  const addressTypeIcon = useMemo(() => {
    const brandName = account.brandName;
    return (
      brandIcon ||
      pickKeyringThemeIcon(brandName as any, {
        needLightVersion: isDarkTheme,
      }) ||
      WALLET_BRAND_CONTENT?.[brandName]?.image
    );
  }, [account, brandIcon, isDarkTheme]);

  return (
    <FieldCheckbox
      className="item"
      showCheckbox={!!account.type}
      onChange={(checked) => checked && onSelect(account)}
      checked={checked}
    >
      <div className="icon icon-keyring relative">
        <img width={24} height={24} src={addressTypeIcon} />
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
        <div className="text-12 text-r-neutral-body native-token-balance">
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
      className="account-select is-support-darkmode"
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
        {!accounts?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-r-neutral-foot">
            <div className="w-[32px] h-[32px] mb-[16px]">
              <RcIconEmpty />
            </div>
            <div className="text-[14px] leading-[24px]">
              No available address
            </div>
          </div>
        ) : null}
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
