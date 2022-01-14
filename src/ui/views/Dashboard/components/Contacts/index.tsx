import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { message, DrawerProps } from 'antd';
import { unionBy } from 'lodash';
import { FixedSizeList } from 'react-window';

import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ContactBookItem } from 'background/service/contactBook';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconAdvanceOption from 'ui/assets/icon-setting.svg';
import IconAddressManagement from 'ui/assets/icon-user.svg';
import IconLock from 'ui/assets/lock.svg';
import LogoRabby from 'ui/assets/logo-rabby-large.svg';
import { Field, Popup } from 'ui/component';
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
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();

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
    fixedList.current?.scrollToItem(15, 'center');
  };
  const handleDeleteAddress = async (address: string) => {
    await wallet.removeContact(address);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Success deleted contact'),
      duration: 1,
    });
    init();
  };
  const handleUpdateContact = async (data: ContactBookItem) => {
    await wallet.updateContact(data);
    await init();
    const alianName = await wallet.getAlianName(data.address);
    if (alianName) {
      await wallet.updateAlianName(data?.address?.toLowerCase(), data?.name);
    }
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Success modified contact'),
      duration: 1,
    });
  };
  const addContact = async (data: ContactBookItem) => {
    await wallet.addContact(data);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Added to contact'),
      duration: 1,
    });
    setEditIndex(null);
    setCanAdd(true);
    init();
  };
  useEffect(() => {
    if (visible) init();
    fixedList.current?.scrollToItem(0);
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
    <>
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
        <div className="list-wrapper">
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
    </>
  );
};

export default Contacts;
