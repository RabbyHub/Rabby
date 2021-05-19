import React, { useEffect, useState } from 'react';
import { Menu, Dropdown, Modal, message } from 'antd';
import { KEYRING_TYPE } from 'consts';
import { useWallet } from 'ui/utils';
import { AddressList, PageHeader, AuthenticationModal } from 'ui/component';
import { DisplayedKeryring } from 'background/service/keyring';
import IconArrowDown from 'ui/assets/arrow-down-gray.svg';
import './style.less';

const AddressManagement = () => {
  const wallet = useWallet();
  const [accounts, setAccounts] = useState<Record<string, DisplayedKeryring[]>>(
    {}
  );
  const [hiddenAddresses, setHiddenAddresses] = useState<
    { type: string; address: string }[]
  >([]);

  useEffect(() => {
    setHiddenAddresses(wallet.getHiddenAddresses());
  }, []);

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllClassAccounts();

    setAccounts(_accounts);
  };

  const AddressActionButton = ({
    data,
    keyring,
  }: {
    data: string;
    keyring: any;
  }) => {
    const handlleViewPrivateKey = async () => {
      try {
        await AuthenticationModal(wallet);
        const privateKey = await keyring.exportAccount(data);
        Modal.info({
          title: 'Private Key',
          content: privateKey,
          cancelText: null,
          okText: null,
        });
      } catch (e) {
        // NOTHING
      }
    };

    const hanleViewMnemonics = async () => {
      try {
        await AuthenticationModal(wallet);
        Modal.info({
          title: 'Mnemonics',
          content: keyring.mnemonic,
          cancelText: null,
          okText: null,
        });
      } catch (e) {
        // NOTHING
      }
    };

    const handleToggleAddressVisible = async () => {
      const isHidden = hiddenAddresses.find(
        (item) => item.type === keyring.type && item.address === data
      );
      if (isHidden) {
        setHiddenAddresses(
          hiddenAddresses.filter(
            (item) => item.type !== keyring.type || item.address !== data
          )
        );
        wallet.showAddress(keyring.type, data);
      } else {
        const totalCount = await wallet.getAccountsCount();
        if (hiddenAddresses.length >= totalCount - 1) {
          message.error('Keep at least one address visible.');
          return;
        }
        setHiddenAddresses([
          ...hiddenAddresses,
          { type: keyring.type, address: data },
        ]);
        wallet.hideAddress(keyring.type, data);
      }
    };

    const DropdownOptions = () => {
      switch (keyring.type) {
        case KEYRING_TYPE.HdKeyring:
          return (
            <Menu>
              <Menu.Item onClick={handleToggleAddressVisible}>
                {hiddenAddresses.find(
                  (item) => item.address === data && item.type === keyring.type
                )
                  ? 'Show'
                  : 'Hide'}{' '}
                address
              </Menu.Item>
              <Menu.Item onClick={hanleViewMnemonics}>View mnemonic</Menu.Item>
              <Menu.Item onClick={handlleViewPrivateKey}>
                View private key
              </Menu.Item>
            </Menu>
          );
        case KEYRING_TYPE.SimpleKeyring:
          return (
            <Menu>
              <Menu.Item onClick={handleToggleAddressVisible}>
                {hiddenAddresses.find(
                  (item) => item.address === data && item.type === keyring.type
                )
                  ? 'Show'
                  : 'Hide'}{' '}
                address
              </Menu.Item>
              <Menu.Item onClick={hanleViewMnemonics}>View mnemonic</Menu.Item>
              <Menu.Item onClick={handlleViewPrivateKey}>
                View private key
              </Menu.Item>
            </Menu>
          );
        default:
          return (
            <Menu>
              <Menu.Item>1</Menu.Item>
            </Menu>
          );
      }
    };
    return (
      <Dropdown overlay={DropdownOptions}>
        <div className="flex">
          {hiddenAddresses.find(
            (item) => item.address === data && item.type === keyring.type
          ) && <div className="address-item-hidden">Hidden</div>}
          <img src={IconArrowDown} className="icon icon-arrow-down" />
        </div>
      </Dropdown>
    );
  };

  useEffect(() => {
    getAllKeyrings();
  }, []);

  return (
    <div className="address-management">
      <PageHeader>Address Management</PageHeader>
      <AddressList
        list={accounts}
        action="management"
        ActionButton={AddressActionButton}
        hiddenAddresses={hiddenAddresses}
      />
    </div>
  );
};

export default AddressManagement;
