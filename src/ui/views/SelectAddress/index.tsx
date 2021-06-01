import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Form } from 'antd';
import { StrayPageWithButton, MultiSelectAddressList } from 'ui/component';
import { useWallet } from 'ui/utils';
import SelectSuccess from './SelectSuccess';

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

export default SelectAddress;
