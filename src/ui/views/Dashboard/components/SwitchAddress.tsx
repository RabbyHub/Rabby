import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DisplayedKeryring } from 'background/service/keyring';
import { Account } from 'background/service/preference';
import { AddressList } from 'ui/component';
import { useWallet } from 'ui/utils';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';
import IconManageAddress from 'ui/assets/manage-address.svg';

const SwitchAddress = ({
  onChange,
  currentAccount,
}: {
  onChange(account: string, type: string): void;
  currentAccount: Account;
}) => {
  const wallet = useWallet();
  const [accounts, setAccounts] = useState<Record<string, DisplayedKeryring[]>>(
    {}
  );
  const { t } = useTranslation();

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllVisibleAccounts();
    setAccounts(_accounts);
  };

  const changeAccount = (account: string, keyring: any) => {
    onChange && onChange(account, keyring.type);
  };

  useEffect(() => {
    getAllKeyrings();
  }, []);

  const SwitchButton = ({ data, keyring }: { data: string; keyring: any }) => {
    return (
      <img
        src={
          currentAccount.address === data &&
          currentAccount.type === keyring.type
            ? IconChecked
            : IconNotChecked
        }
        className="icon icon-checked"
      />
    );
  };

  return accounts ? (
    <div className="modal-switch-address">
      <AddressList
        list={accounts}
        ActionButton={SwitchButton}
        onClick={changeAccount}
      />
      <div className="footer">
        <Link to="/settings/address">
          <img src={IconManageAddress} className="icon icon-add" />
          {t('Manage addresses')}
        </Link>
      </div>
    </div>
  ) : null;
};

export default SwitchAddress;
