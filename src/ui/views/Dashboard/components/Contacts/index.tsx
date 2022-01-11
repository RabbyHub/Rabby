import React, { useEffect, useState, useRef } from 'react';
import { Button, DrawerProps } from 'antd';
import { unionBy } from 'lodash';
import { FixedSizeList } from 'react-window';

import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconAdvanceOption from 'ui/assets/icon-setting.svg';
import IconAddressManagement from 'ui/assets/icon-user.svg';
import IconLock from 'ui/assets/lock.svg';
import LogoRabby from 'ui/assets/logo-rabby-large.svg';
import { Field, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import ContactsItem from './ContactsItem';
import IconAddAddress from 'ui/assets/dashboard/contacts/add-address.png';
import './style.less';

interface ContactsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}
export interface Account {
  address: string;
  type?: string;
  brandName?: string;
  alianName?: string;
  displayBrandName?: string;
  index?: number;
  balance?: number;
  name?: string;
}
const Contacts = ({ visible, onClose }: ContactsProps) => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const getAllAlianName = async () => {
    return await wallet.getAllAlianName();
  };
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const init = async () => {
    const listContacts = await wallet.listContact();
    const alianNames = await getAllAlianName();
    const importAccounts = await wallet.getAllVisibleAccounts();
    const importAccountsList: Account[] = unionBy(
      importAccounts
        .map((item) =>
          item.accounts.map((acc) => {
            return {
              ...acc,
              type: item.type,
              alianName: alianNames[acc?.address?.toLowerCase()],
            };
          })
        )
        .flat(),
      (item) => item?.address.toLowerCase()
    );
    const deduplicatedContacts = listContacts.filter(
      (item) => !alianNames[item?.address?.toLowerCase()]
    );
    setAccounts([...importAccountsList, ...deduplicatedContacts]);
  };
  const addNewAccount = () => {
    const newAccount: Account = {
      address: '',
      name: '',
    };
    setAccounts([...accounts, newAccount]);
    setEditIndex(accounts.length);
    fixedList.current?.scrollToItem(15, 'center');
  };

  const Row = (props) => {
    const { data, index, style } = props;
    const { accounts, others } = data;
    const item = accounts[index];
    return (
      <div style={style} key={index}>
        <ContactsItem
          key={item?.address || index}
          account={item}
          index={index}
          setEditIndex={setEditIndex}
          editIndex={editIndex}
          accounts={accounts}
        />
      </div>
    );
  };
  const onItemsRendered = ({ overscanStartIndex, overscanStopIndex }) => {
    console.log(overscanStartIndex, overscanStopIndex);
  };
  useEffect(() => {
    if (visible) init();
    fixedList.current?.scrollToItem(0);
  }, [visible]);
  //   useEffect(() => {
  //     console.log(33333);
  //     fixedList.current?.scrollToItem(15, 'center');
  //   }, [accounts.length]);
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
          <FixedSizeList
            height={1576}
            width={360}
            itemData={{
              accounts: accounts,
            }}
            itemCount={accounts.length}
            itemSize={48}
            ref={fixedList}
            onItemsRendered={onItemsRendered}
            className="no-scrollbars"
          >
            {Row}
          </FixedSizeList>
          {/* {accounts.map((item, index) => (
            <ContactsItem
              key={item?.address || index}
              account={item}
              index={index}
              setEditIndex={setEditIndex}
              editIndex={editIndex}
              accounts={accounts}
            />
          ))} */}
        </div>
        <img
          src={IconAddAddress}
          className="add-address-name"
          onClick={addNewAccount}
        />
      </Popup>
    </>
  );
};

export default Contacts;
