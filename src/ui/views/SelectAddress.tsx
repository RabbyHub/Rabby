import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Form } from 'antd';
import {
  StrayPageWithButton,
  MultiSelectAddressList,
  AddressList,
} from 'ui/component';
import { useWallet, getUiType } from 'ui/utils';
import { IconImportSuccess } from 'ui/assets';

const { AddressItem } = AddressList;

const SelectAddress = () => {
  const history = useHistory();
  const { state } = useLocation<{ keyring: any; isMnemonics?: boolean }>();

  if (!state) {
    history.replace('/dashboard');
    return null;
  }

  const { keyring, isMnemonics } = state;
  const [spinning, setSpin] = useState(false);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [importedAccounts, setImportedAccounts] = useState<any[]>([]);
  const [successAccounts, setSuccessAccounts] = useState<any[]>([]);
  const [form] = Form.useForm();
  const wallet = useWallet();

  const getAccounts = async (firstFlag = false) => {
    setSpin(true);
    try {
      const _accounts = firstFlag
        ? await keyring.getFirstPage()
        : await keyring.getNextPage();

      if (_accounts.length < 5) {
        throw new Error(
          'You need to make use your last account before you can add a new one.'
        );
      }
      setSpin(false);
      setAccounts(accounts.concat(..._accounts));
    } catch (err) {
      console.log('get hardware account error', err);
      setSpin(false);
    }
  };

  const init = async () => {
    const _importedAccounts = await keyring.getAccounts();
    setImportedAccounts(_importedAccounts);

    getAccounts(true);
  };

  useEffect(() => {
    init();
  }, []);

  const onSubmit = async ({ selectedAddressIndexes }) => {
    if (isMnemonics) {
      keyring.activeAccounts(selectedAddressIndexes);
      await wallet.addKeyring(keyring);
    } else {
      await wallet.unlockHardwareAccount(keyring, selectedAddressIndexes);
    }
    setSuccessAccounts(selectedAddressIndexes.map((i) => accounts[i]));
  };

  return successAccounts.length ? (
    <SelectSuccess accounts={successAccounts} hasDivider={isMnemonics} />
  ) : (
    <StrayPageWithButton
      spinning={spinning}
      header={
        isMnemonics
          ? {
              secondTitle: 'Import Mnemonics',
              subTitle: 'Please input your mnemonics below',
            }
          : {
              title: 'Select Addresses',
              subTitle: 'Select the addresses to vlew in Rabby',
              center: true,
            }
      }
      onSubmit={onSubmit}
      hasBack
      hasDivider={isMnemonics}
      form={form}
    >
      <Form.Item
        className="mb-0 lg:max-h-[500px] overflow-auto"
        name="selectedAddressIndexes"
      >
        <MultiSelectAddressList
          accounts={accounts}
          importedAccounts={importedAccounts}
        />
      </Form.Item>
      <div
        onClick={() => getAccounts()}
        className="mt-28 text-blue text-15 text-center cursor-pointer mb-[120px]"
      >
        Load More...
      </div>
    </StrayPageWithButton>
  );
};

const SelectSuccess = ({ accounts, hasDivider }) => {
  const history = useHistory();

  const handleNextClick = () => {
    if (getUiType().isTab) {
      window.close();

      return;
    }
    history.push('/dashboard');
  };

  return (
    <StrayPageWithButton
      hasDivider={hasDivider}
      NextButtonText="ok"
      onNextClick={handleNextClick}
    >
      <div className="flex flex-col justify-center text-center">
        <img
          src={IconImportSuccess}
          className="mx-auto mb-18 w-[100px] h-[100px]"
        />
        <div className="text-title text-20 mb-2">
          {accounts?.length} addresses
        </div>
        <div className="text-green text-15 mb-12">Successfully imported</div>
        <div className="overflow-auto flex-1 mb-[120px] w-[460px]">
          {accounts.map((account) => (
            <AddressItem
              className="mb-12 rounded bg-white py-12 pl-16"
              key={account.address}
              account={account.address}
            />
          ))}
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default SelectAddress;
