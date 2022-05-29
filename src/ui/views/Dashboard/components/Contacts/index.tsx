import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { message, DrawerProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { ContactBookItem } from 'background/service/contactBook';
import { Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import ContactsItem from './ContactsItem';
import IconSuccess from 'ui/assets/success.svg';
import IconAddAddress from 'ui/assets/dashboard/contacts/add-address.png';
import LessPalette from 'ui/style/var-defs';
import { SvgIconCross } from 'ui/assets';
import { styid } from '@/ui/utils/styled';

const closeIcon = (
  <SvgIconCross className="w-14 fill-current text-gray-content" />
);

interface ContactsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}
export interface Account {
  address: string;
  name?: string;
}

const NoDataUI = styled.div`
  .no-data-image {
    width: 156px;
    padding-top: 136px;
    margin: 0 auto 32px auto;
  }
`;

const ListWrapper = styled.div``;

const ContactsPopup = styled(Popup)`
  .ant-drawer-body {
    padding-top: 0 !important;
  }
  .ant-drawer-header {
    border-bottom: none;
  }
  .ant-drawer-title {
    font-weight: 500;
    font-size: 20px;
    line-height: 23px;
    text-align: center;
    color: #161819;
  }

  .header {
    position: absolute;
    display: flex;
    font-size: 14px;
    line-height: 16px;
    top: 64px;
    text-align: center;
    align-items: flex-start;
    color: ${LessPalette['@color-comment-1']};
    background: #ffffff;
    & > div:nth-child(1) {
      padding-left: 12px;
    }
    & > div:nth-last-child(1) {
      margin-left: 125px;
    }
  }
  .add-address-name {
    position: absolute;
    cursor: pointer;
    width: 40px;
    height: 40px;
    right: 20px;
    bottom: 28px;
    z-index: 1;
  }

  .${styid(ListWrapper)} {
    width: 100%;
    background: ${LessPalette['@color-bg']};
    border-radius: 6px;
    padding-bottom: 300px;
    min-height: 576px;

    .hover,
    .contact-item-wrapper:hover {
      background: rgba(134, 151, 255, 0.1);
      border: 1px solid #8697ff !important;
      border-radius: 6px;
      .copy-icon,
      .hint,
      .edit-name-wrapper {
        display: flex !important;
        justify-content: center;
        align-items: center;
      }
    }
  }
`;

const Contacts = ({ visible, onClose }: ContactsProps) => {
  const ref = useRef(null);
  const wallet = useWallet();
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [canAdd, setCanAdd] = useState(true);
  const init = async () => {
    const listContacts = await wallet.listContact();
    setAccounts(listContacts);
    setEditIndex(null);
    setCanAdd(true);
  };
  const addNewAccount = () => {
    const newAccount: Account = {
      address: '',
      name: '',
    };
    setCanAdd(false);
    setAccounts([...accounts, newAccount]);
    setEditIndex(accounts.length);
  };
  const handleDeleteAddress = async (address: string) => {
    await wallet.removeContact(address);
    init();
  };
  const syncAlianName = async (data: ContactBookItem) => {
    const alianName = await wallet.getAlianName(data.address.toLowerCase());
    if (alianName) {
      await wallet.updateAlianName(data?.address?.toLowerCase(), data?.name);
    }
  };
  const handleUpdateContact = async (data: ContactBookItem) => {
    await wallet.updateContact(data);
    await syncAlianName(data);
    await init();
  };
  const addContact = async (data: ContactBookItem) => {
    await wallet.addContact(data);
    await syncAlianName(data);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Added to contact'),
      duration: 1,
    });
    setEditIndex(null);
    setCanAdd(true);
    init();
  };
  const hideNewContact = () => {
    if (!canAdd) {
      setCanAdd(true);
      setAccounts(accounts.slice(0, accounts.length - 1));
    }
  };
  useEffect(() => {
    if (visible) {
      init();
    } else {
      setAccounts([]);
    }
  }, [visible]);

  return (
    <ContactsPopup
      visible={visible}
      onClose={onClose}
      title={'Contacts'}
      bodyStyle={{ height: '100%' }}
      closeIcon={closeIcon}
      contentWrapperStyle={{
        height: 580,
      }}
      drawerStyle={{
        height: 580,
      }}
      headerStyle={{
        height: 92,
        marginBottom: 6,
      }}
      className="contacts-drawer"
      closable
    >
      <div className="header">
        <div>Address</div>
        <div>Memo</div>
      </div>
      <ListWrapper
        className="list-wrapper"
        ref={ref}
        onClick={(e) => {
          const isClickOutside = e.target === ref.current;
          if (!isClickOutside) {
            return;
          }
          hideNewContact();
          if (editIndex) {
            setEditIndex(null);
            init();
          }
        }}
      >
        {accounts.length > 0 ? (
          accounts.map((item, index) => (
            <ContactsItem
              key={item.address}
              account={item}
              index={index}
              setEditIndex={setEditIndex}
              editIndex={editIndex}
              accounts={accounts}
              handleDeleteAddress={handleDeleteAddress}
              handleUpdateContact={handleUpdateContact}
              addContact={addContact}
              hideNewContact={hideNewContact}
            />
          ))
        ) : (
          <NoDataUI className="no-contact">
            <img
              className="no-data-image"
              src="/images/nodata-site.png"
              alt="no contact"
            />
            <p className="text-gray-content text-14 text-center">
              {t('No contacts')}
            </p>
          </NoDataUI>
        )}
      </ListWrapper>
      {canAdd && (
        <img
          src={IconAddAddress}
          className="add-address-name"
          onClick={addNewAccount}
        />
      )}
    </ContactsPopup>
  );
};

export default Contacts;
