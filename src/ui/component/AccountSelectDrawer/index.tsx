import React, { useState, useEffect } from 'react';
import { Drawer, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import FieldCheckbox from 'ui/component/FieldCheckbox';
import AddressViewer from 'ui/component/AddressViewer';
import { Account } from 'background/service/preference';
import { useWallet, isSameAddress } from 'ui/utils';
import { KEYRING_TYPE, KEYRING_ICONS, WALLET_BRAND_CONTENT } from 'consts';
import './style.less';

interface AccountSelectDrawerProps {
  onChange(account: Account): void;
  onCancel(): void;
  title: string;
  visible: boolean;
  isLoading?: boolean;
}

interface AccountItemProps {
  account: Account;
  checked: boolean;
  onSelect(account: Account): void;
}

const AccountItem = ({ account, onSelect, checked }: AccountItemProps) => {
  const [alianName, setAlianName] = useState('');
  const wallet = useWallet();

  const init = async () => {
    const name = await wallet.getAlianName(account.address);
    setAlianName(name);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <FieldCheckbox
      className="item"
      showCheckbox={!!account.type}
      onChange={(checked) => checked && onSelect(account)}
      checked={checked}
    >
      <img
        src={
          KEYRING_ICONS[account.type] ||
          WALLET_BRAND_CONTENT[account.brandName]?.image
        }
        className="icon icon-keyring"
      />
      <div>
        <p className="alian-name">{alianName}</p>
        <AddressViewer address={account.address} showArrow={false} />
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
}: AccountSelectDrawerProps) => {
  const [checkedAccount, setCheckedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { t } = useTranslation();
  const wallet = useWallet();

  const init = async () => {
    const visibleAccounts: Account[] = await wallet.getAllVisibleAccountsArray();
    setAccounts(
      visibleAccounts.filter((item) => item.type !== KEYRING_TYPE.GnosisKeyring)
    );
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
          {t('Cancel')}
        </Button>
        <Button
          type="primary"
          onClick={() => checkedAccount && onChange(checkedAccount)}
          disabled={!checkedAccount}
          loading={isLoading}
        >
          {t('Proceed')}
        </Button>
      </div>
    </Drawer>
  );
};

export default AccountSelectDrawer;
