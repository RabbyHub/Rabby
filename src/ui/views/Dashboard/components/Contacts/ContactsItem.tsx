import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import ClipboardJS from 'clipboard';
import { Input, message, Dropdown, Menu } from 'antd';
import { useHistory } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { UIContactBookItem } from 'background/service/contactBook';
import { AddressViewer } from 'ui/component';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconUnCorrect from 'ui/assets/dashboard/contacts/uncorrect.png';
import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconSend from 'ui/assets/dashboard/contacts/send-icon.png';
import IconHint from 'ui/assets/dashboard/contacts/action.png';

import { Account } from './index';
import LessPalette from '@/ui/style/var-defs';

const Wrapper = styled.div`
  width: 100%;
  height: 48px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 6px;

  display: flex;
  align-items: center;
  position: relative;
  .ant-input {
    position: relative;
    width: 144px;
    height: 36px;
    background: ${LessPalette['@color-bg']};
    border-radius: 4px;
    margin-left: 4px;
    margin-right: 32px;
    padding-left: 6px;
    border: ${LessPalette['@color-bg']};
    &::placeholder {
      font-size: 12px;
    }
    &:nth-last-child(1) {
      position: absolute;
      left: 180px !important;
      margin: 0 !important;
      padding-left: 6px;
    }
  }
  .address-input {
    position: absolute;
    left: 6px !important;
    margin: 0 !important;
    padding-left: 6px !important;
  }
  .name-input {
    position: absolute;
    left: 180px !important;
    margin: 0 !important;
    padding-left: 8px !important;
  }
  .view-address-color {
    color: ${LessPalette['@color-title']};
    flex: 1;
    padding-left: 12px;
  }
  .alian-name {
    position: absolute;
    max-width: 125px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: 176px;
  }
  .copy-icon {
    display: none;
    width: 16px;
    height: 16px;
    margin-left: 6px;
  }
  .edit-name-wrapper {
    display: none;
    justify-content: center;
    align-items: center;
    position: absolute;
    right: 16px;
    width: 28px;
    height: 28px;
    padding: 7px;
    border: 0.5px solid rgba(134, 151, 255, 0.5);
    box-sizing: border-box;
    border-radius: 4px;
    &:hover {
      background: rgba(134, 151, 255, 0.2);
      border: 0.5px solid rgba(134, 151, 255, 0.5);
    }
    .edit-name {
      width: 13px;
      height: 13px;
      margin: 0;
    }
  }
  .correct {
    position: absolute;
    right: 12px;
    width: 16px;
    height: 16px;
  }
  .hint {
    display: none;
    position: absolute;
    right: -20px;
    width: 20px;
    height: 20px;
  }
  ::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 0;
    bottom: 0;
    height: 1px;
    width: 336px;
    border-bottom: ${LessPalette['@color-border']};
  }
`;
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
  handleUpdateContact(data: UIContactBookItem): void;
  addContact(data: UIContactBookItem): void;
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
    const data: UIContactBookItem = {
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
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{account?.address}</div>
          </div>
        ),
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
    <Wrapper
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
    </Wrapper>
  );
};

export default ContactsItem;
