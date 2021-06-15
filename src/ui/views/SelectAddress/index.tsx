import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Form } from 'antd';
import { StrayPageWithButton, MultiSelectAddressList } from 'ui/component';
import { useWallet } from 'ui/utils';

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

    history.replace({
      pathname: '/import/success',
      state: {
        accounts: selectedAddressIndexes.map((i) => accounts[i]),
        hasDivider: !!isMnemonics,
      },
    });
  };

  return (
    <StrayPageWithButton
      spinning={spinning}
      header={
        isMnemonics
          ? {
              secondTitle: 'Select Addresses',
              subTitle: 'Select the addresses you want to import',
            }
          : {
              title: 'Select Addresses',
              subTitle: 'Select the addresses you want to import',
              center: true,
            }
      }
      onSubmit={onSubmit}
      hasBack
      hasDivider={isMnemonics}
      form={form}
    >
      <div className="overflow-y-auto lg:h-[480px]">
        <Form.Item className="mb-0" name="selectedAddressIndexes">
          <MultiSelectAddressList
            accounts={accounts}
            importedAccounts={importedAccounts}
          />
        </Form.Item>
        <div
          onClick={() => getAccounts()}
          className="mt-6 text-blue text-15 text-center cursor-pointer lg:mb-[100px]"
        >
          Load More...
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default SelectAddress;
