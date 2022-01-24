import React, { useEffect, useRef, useState } from 'react';
import ClipboardJS from 'clipboard';
import { Input, message, Dropdown, Menu } from 'antd';
import { useHistory } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { ContactBookItem } from 'background/service/contactBook';
import { AddressViewer } from 'ui/component';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconUnCorrect from 'ui/assets/dashboard/contacts/uncorrect.png';
import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconSend from 'ui/assets/dashboard/contacts/send-icon.png';
import IconHint from 'ui/assets/dashboard/contacts/action.png';

import { Account } from './index';

export interface ContactsItem {
  account: {
    address: string;
    name?: string;
  };
  index: number;
  setEditIndex(index: number | null): void;
  editIndex: number | null;
  accounts: Account[];
  handleDeleteAddress(address: string): void;
  handleUpdateContact(data: ContactBookItem): void;
  addContact(data: ContactBookItem): void;
  hideNewContact(): void;
}
const ContactsItem = ({
  account,
  index,
  setEditIndex,
  editIndex,
  accounts,
  handleDeleteAddress,
  handleUpdateContact,
  addContact,
  hideNewContact,
}: ContactsItem) => {
  const memoRef = useRef<Input | null>(null);
  const ref = React.useRef(null);
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [address, setAddress] = useState<string>(account?.address || '');
  const [alianName, setAlianName] = useState<string>(account?.name || '');
  const [nameFocus, setNameFocus] = useState<boolean>(false);
  const [addressFocus, setAddressFocus] = useState<boolean>(
    !account.address && !account.name
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const startEdit = index === editIndex;
  const newInput = !account.address && !account.name;
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setAddress(e.target.value);
  };
  const handleAlianNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setAlianName(e.target.value);
  };
  const addressConfirm = async (e?: any) => {
    e && e.stopPropagation();
    if (!addressValid) return;
    const importedName = await wallet.getAlianName(address.toLowerCase());
    if (importedName) {
      setAlianName(importedName);
    }
    return true;
  };
  const alianNameConfirm = (e?: any) => {
    e && e.stopPropagation();

    setNameFocus(false);
    return true;
  };
  const addressValid = () => {
    if (address.length !== 42 || !address.startsWith('0x')) {
      message.error({
        icon: null,
        content: t('Not a valid address'),
        duration: 1,
      });
      return false;
    }
    return true;
  };
  const nameValid = () => {
    if (!alianName || alianName.trim() === '') {
      message.error({
        icon: null,
        content: t('Not a valid name'),
        duration: 1,
      });
      return false;
    }
    return true;
  };
  const validateAddressAndName = async () => {
    if (!alianName || !address) {
      return;
    }
    const filtedCurrentAccount = accounts.filter((item, i) => i !== index);
    const duplicatedName = filtedCurrentAccount.find(
      (item) => item.name === alianName
    );
    const duplicatedAddress = filtedCurrentAccount.find(
      (item) => item.address.toLowerCase() === address.toLowerCase()
    );
    if (duplicatedAddress) {
      message.error({
        icon: null,
        content: t('Duplicated address'),
        duration: 1,
      });
      return;
    }
    if (duplicatedName) {
      message.error({
        icon: null,
        content: t('Duplicated name'),
        duration: 1,
      });
      return;
    }
    if (!addressValid() || !nameValid()) return;
    const data: ContactBookItem = {
      name: alianName,
      address: address.toLowerCase(),
    };
    if (newInput) {
      addContact(data);
    }
    if (!newInput) {
      handleUpdateContact(data);
    }
  };
  const sendToken = () => {
    history.push(
      `/send-token?address=${account?.address}&name=${account?.name}`
    );
  };
  const handleCopyContractAddress = () => {
    const clipboard = new ClipboardJS('.contact-item-wrapper', {
      text: function () {
        return account?.address;
      },
    });
    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: 'Copied',
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const DropdownOptions = () => {
    return (
      <Menu>
        <Menu.Item
          onClick={() => {
            setEditIndex(index);
            setNameFocus(true);
            memoRef.current?.focus();
            if (!newInput) {
              hideNewContact();
            }
          }}
        >
          {t('Edit address memo')}
        </Menu.Item>
        <Menu.Item onClick={() => handleDeleteAddress(account?.address)}>
          {t('Delete address')}
        </Menu.Item>
      </Menu>
    );
  };
  useEffect(() => {
    setAlianName(account?.name || '');
    setAddress(account?.address || '');
  }, [account, startEdit]);
  useEffect(() => {
    if (address.length === 42 && address.startsWith('0x') && newInput) {
      addressConfirm();
    }
  }, [address]);
  return (
    <div
      ref={ref}
      className={clsx(
        'contact-item-wrapper',
        (newInput || startEdit) && 'hover'
      )}
    >
      {addressFocus ? (
        <Input
          value={address}
          defaultValue={address}
          className="address-input"
          onChange={handleAddressChange}
          onPressEnter={addressConfirm}
          onClick={(e) => e.stopPropagation()}
          autoFocus={addressFocus}
          maxLength={42}
          min={0}
          placeholder="Enter Address"
        />
      ) : (
        <AddressViewer
          address={address}
          showArrow={false}
          className={'view-address-color, cursor-default'}
          onClick={() => {
            if (newInput) {
              setAddressFocus(true);
              setNameFocus(false);
            }
          }}
        />
      )}

      {!startEdit && !newInput && (
        <img
          onClick={handleCopyContractAddress}
          src={IconAddressCopy}
          id={'copyIcon'}
          className={clsx('copy-icon', {
            success: copySuccess,
          })}
        />
      )}
      {newInput || startEdit ? (
        <Input
          ref={memoRef}
          value={alianName}
          defaultValue={alianName}
          className="name-input"
          onChange={handleAlianNameChange}
          onPressEnter={validateAddressAndName}
          onClick={(e) => e.stopPropagation()}
          autoFocus={nameFocus}
          placeholder="Enter Memo"
          maxLength={20}
          min={0}
        />
      ) : (
        <div
          className="alian-name"
          onClick={() => {
            if (startEdit) {
              setNameFocus(true);
            }
          }}
        >
          {alianName}
        </div>
      )}
      {!startEdit && !newInput && (
        <div className="edit-name-wrapper cursor-pointer" onClick={sendToken}>
          <img className="edit-name" src={IconSend} />
        </div>
      )}
      {(startEdit || newInput) && (
        <img
          className="correct cursor-pointer"
          src={alianName && address ? IconCorrect : IconUnCorrect}
          onClick={validateAddressAndName}
        />
      )}
      <Dropdown
        overlay={DropdownOptions}
        trigger={['click']}
        getPopupContainer={() => document.querySelector('.list-wrapper')!}
      >
        <img className="cursor-pointer hint" src={IconHint} />
      </Dropdown>
    </div>
  );
};

export default ContactsItem;
