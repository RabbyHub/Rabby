import React, { useState, useEffect } from 'react';
import { KEYRING_CLASS } from 'consts';
import { DisplayedKeryring } from 'background/service/keyring';
import { useWallet } from 'ui/utils';

const ADDRESS_TYPES = [
  {
    type: KEYRING_CLASS.MNEMONIC,
    name: 'Seed Phrase address',
  },
  {
    type: KEYRING_CLASS.PRIVATE_KEY,
    name: 'Private Key address',
  },
  {
    type: 'hardware',
    name: 'Hardware wallet address',
  },
  {
    type: KEYRING_CLASS.WATCH,
    name: 'Watch address',
  },
];

const AccountList = () => {
  const wallet = useWallet();
  const [accounts, setAccounts] = useState<DisplayedKeryring[]>([]);

  const initData = async () => {
    const accounts = await wallet.getAllClassAccounts();
    setAccounts(accounts);
  };

  useEffect(() => {
    initData();
  }, []);

  return (
    <>
      {accounts &&
        ADDRESS_TYPES.map(
          ({ type, name }) =>
            accounts[type] &&
            accounts[type].map(
              ({ type: keyringType, accounts: keyringAccounts }) => (
                <div className="mb-16">
                  <div>{name}</div>
                  <div></div>
                </div>
              )
            )
        )}
    </>
  );
};

export default AccountList;
