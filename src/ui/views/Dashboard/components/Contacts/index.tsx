import React, { useEffect, useState } from 'react';
import { DrawerProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { Item, PageHeader, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';
import styled from 'styled-components';
import LessPalette from '@/ui/style/var-defs';
import AddressItem from '@/ui/component/AddressList/AddressItem';

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
      title={
        <PageHeader
          forceShowBack
          canBack
          className="pt-0"
          onBack={() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            onClose();
          }}
        >
          Old Contact List
        </PageHeader>
      }
      bodyStyle={{ height: '100%' }}
      contentWrapperStyle={{
        height: 520,
      }}
      drawerStyle={{
        height: 520,
      }}
      headerStyle={{
        height: 64,
      }}
      className="contacts-drawer"
      closable={false}
    >
      <Desc>
        Because of the merging of contacts and watch model addresses, the old
        contacts will be backed up for you here and after some time we will
        delete the list.Please add in time if you continue to use.
      </Desc>
      <div>
        {accounts.length > 0
          ? accounts.map((item) => (
              <Item
                key={item.address}
                py={11}
                bgColor="#F5F6FA"
                rightIcon={null}
              >
                <AddressItem
                  className="list-none"
                  editing={false}
                  account={{
                    address: item.address,
                    alianName: item.name || ' ',
                    type: '',
                    brandName: '',
                    index: undefined,
                  }}
                />
              </Item>
            ))
          : NoDataUI}
      </div>
    </Popup>
  );
};

const Desc = styled.div`
  font-weight: 400;
  font-size: 14px;
  line-height: 18px;
  color: ${LessPalette['@color-body']};
  margin-bottom: 20px;
`;

export default Contacts;
