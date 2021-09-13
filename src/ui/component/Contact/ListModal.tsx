import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'antd';
import { useWallet } from 'ui/utils';
import { AddressViewer, FieldCheckbox } from '..';
import { ContactBookItem } from 'background/service/contactBook';
import './style.less';

interface ListModalProps {
  address?: string;
  visible: boolean;
  onOk(data: ContactBookItem): void;
  onCancel(): void;
}

const ListModal = ({ address, visible, onOk, onCancel }: ListModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [list, setList] = useState<ContactBookItem[]>([]);

  useEffect(() => {
    if (visible) {
      const data = wallet.listContact();
      setList(data);
    }
  }, [visible]);

  const handleConfirm = (data: ContactBookItem) => {
    onOk(data);
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
      {list.length > 0
        ? list.map((item) => (
            <FieldCheckbox
              key={item.address}
              checked={item.address.toLowerCase() === address?.toLowerCase()}
              onChange={() => handleConfirm(item)}
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
    </Modal>
  );
};

export default ListModal;
