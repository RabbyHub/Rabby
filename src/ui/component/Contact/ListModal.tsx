import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Modal, Tabs, Tooltip } from 'antd';
import { unionBy } from 'lodash';
import {
  WALLET_BRAND_CONTENT,
  KEYRING_ICONS,
  KEYRING_TYPE_TEXT,
  BRAND_ALIAN_TYPE_TEXT,
} from 'consts';
import { useWallet } from 'ui/utils';
import { AddressViewer, FieldCheckbox } from '..';
import { ContactBookItem } from 'background/service/contactBook';

import './style.less';

interface ListModalProps {
  address?: string;
  visible: boolean;
  onOk(data: ContactBookItem, type: string): void;
  onCancel(): void;
}
interface Account {
  address: string;
  brandName: string;
  type: string;
}
const { TabPane } = Tabs;
const ListModal = ({ address, visible, onOk, onCancel }: ListModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [list, setList] = useState<ContactBookItem[]>([]);
  const [alianNames, setAlianNames] = useState({});
  const [accountList, setAccountList] = useState<Account[]>([]);
  const handleVisibleChange = async () => {
    if (visible) {
      const data = await wallet.listContact();
      const importedList = await wallet.getAllAlianName();
      const importAccounts = await wallet.getAllVisibleAccounts();
      const importAccountsList: Account[] = unionBy(
        importAccounts
          .map((item) =>
            item.accounts.map((acc) => {
              return {
                ...acc,
                type: item.type,
              };
            })
          )
          .flat(),
        (item) => item?.address.toLowerCase()
      );
      setAccountList(importAccountsList);
      setList(data);
      setAlianNames(importedList);
    }
  };

  useEffect(() => {
    handleVisibleChange();
  }, [visible]);

  const handleConfirm = (data: ContactBookItem, type: string) => {
    onOk(data, type);
  };
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
  const formatAddressTooltip = (type: string, brandName: string) => {
    if (KEYRING_TYPE_TEXT[type]) {
      return t(KEYRING_TYPE_TEXT[type]);
    }
    if (WALLET_BRAND_CONTENT[brandName]) {
      return (
        <Trans
          i18nKey="addressTypeTip"
          values={{
            type: WALLET_BRAND_CONTENT[brandName].name,
          }}
        />
      );
    }
    return '';
  };
  return (
    <Modal
      className="list-contact-modal"
      visible={visible}
      cancelButtonProps={{ style: { display: 'none' } }}
      onCancel={onCancel}
      footer={null}
      width="360px"
      centered
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab={t('Contacts')} className="text-15" key="1">
          {list.length > 0
            ? list.map((item) => (
                <FieldCheckbox
                  key={item.address}
                  checked={
                    item.address.toLowerCase() === address?.toLowerCase()
                  }
                  onChange={() => handleConfirm(item, 'others')}
                >
                  <div className="contact-info">
                    <p>{item.name}</p>
                    <p>
                      <AddressViewer address={item.address} />
                    </p>
                  </div>
                </FieldCheckbox>
              ))
            : NoDataUI}
        </TabPane>
        <TabPane tab={t('My accounts')} className="text-15" key="2">
          {accountList.length > 0
            ? accountList.map((account) => (
                <FieldCheckbox
                  key={account.address + account.brandName}
                  checked={
                    account?.address?.toLowerCase() === address?.toLowerCase()
                  }
                  onChange={() =>
                    handleConfirm(
                      {
                        address: account?.address,
                        name: alianNames[account?.address?.toLowerCase()],
                      },
                      'my'
                    )
                  }
                >
                  <Tooltip
                    overlayClassName="rectangle addressType__tooltip"
                    placement="topRight"
                    title={formatAddressTooltip(
                      account?.type,
                      BRAND_ALIAN_TYPE_TEXT[account?.brandName]
                    )}
                  >
                    <img
                      src={
                        KEYRING_ICONS[account?.type] ||
                        WALLET_BRAND_CONTENT[account?.brandName]?.image
                      }
                      className="w-[24px] h-[24px]"
                    />
                  </Tooltip>
                  <div className="contact-info ml-12">
                    <p>{alianNames[account?.address?.toLowerCase()]}</p>
                    <p>
                      <AddressViewer address={account?.address} />
                    </p>
                  </div>
                </FieldCheckbox>
              ))
            : NoDataUI}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ListModal;
