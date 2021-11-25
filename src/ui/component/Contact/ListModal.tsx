import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Tabs } from 'antd';
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
  name: string;
}
const { TabPane } = Tabs;
function callback(key) {
  console.log(key);
}
const ListModal = ({ address, visible, onOk, onCancel }: ListModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [list, setList] = useState<ContactBookItem[]>([]);
  const [alianNames, setAlianNames] = useState({});
  const handleVisibleChange = async () => {
    if (visible) {
      const data = await wallet.listContact();
      const importedList = await wallet.getAllAlianName();
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

  return (
    <Modal
      className="list-contact-modal"
      title={t('Contacts')}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width="360px"
      centered
    >
      <Tabs defaultActiveKey="1" onChange={callback}>
        <TabPane tab="Tab 1" key="1">
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
        <TabPane tab="Tab 2" key="2">
          {Object.keys(alianNames).length > 0
            ? Object.keys(alianNames).map((key) => (
                <FieldCheckbox
                  key={key}
                  checked={key.toLowerCase() === address?.toLowerCase()}
                  onChange={() =>
                    handleConfirm(
                      {
                        address: key,
                        name: alianNames[key],
                      },
                      'my'
                    )
                  }
                >
                  <div className="contact-info">
                    <p>{alianNames[key]}</p>
                    <p>
                      <AddressViewer address={key} />
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
