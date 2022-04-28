import React, { useEffect, useRef, useState } from 'react';
import { message, DrawerProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { ContactBookItem } from 'background/service/contactBook';
import { Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import ContactsItem from './ContactsItem';
import IconSuccess from 'ui/assets/success.svg';
import IconAddAddress from 'ui/assets/dashboard/contacts/add-address.png';
import './style.less';

interface ContactsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}
export interface Account {
  address: string;
  name?: string;
}
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
  const NoDataUI = (
    <div className="no-contact">
      <img
        className="no-data-image"
        src="/images/nodata-site.png"
        alt="no contact"
      />
      <p className="text-gray-content text-14 text-center">
        {t('No contacts')}
      </p>
    </div>
  );
  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title={'Contacts'}
      bodyStyle={{ height: '100%' }}
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
      <div
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
        {accounts.length > 0
          ? accounts.map((item, index) => (
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
          : NoDataUI}
      </div>
      {canAdd && (
        <img
          src={IconAddAddress}
          className="add-address-name"
          onClick={addNewAccount}
        />
      )}
    </Popup>
  );
};

export default Contacts;
