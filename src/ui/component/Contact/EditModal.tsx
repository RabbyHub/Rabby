import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button, Form } from 'antd';
import { useWallet } from 'ui/utils';
import { AddressViewer } from '..';
import { ContactBookItem } from 'background/service/contactBook';
import './style.less';

interface EditModalProps {
  address: string;
  visible: boolean;
  onOk(data: ContactBookItem): void;
  onCancel(): void;
  isEdit: boolean;
}

const EditModal = ({
  address,
  visible,
  onOk,
  onCancel,
  isEdit = true,
}: EditModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [name, setName] = useState(
    isEdit ? wallet.getContactByAddress(address).name : ''
  );

  const handleConfirm = () => {
    if (isEdit) {
      wallet.updateContact({
        address,
        name,
      });
    } else {
      wallet.addContact({
        address,
        name,
      });
    }
    onOk({ address, name });
  };

  const handleRemoveContact = () => {
    // TODO
  };

  const handleNameChange = (value: string) => {
    setName(value);
  };

  return (
    <Modal
      className="edit-contact-modal"
      title={isEdit ? t('Edit address memo') : t('Add address memo')}
      visible={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      footer={null}
      width="360px"
    >
      <div className="flex justify-center mb-16">
        <AddressViewer address={address} showArrow={false} />
      </div>
      <Form onFinish={handleConfirm}>
        <Input
          allowClear
          maxLength={24}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </Form>
      <div className="flex justify-center">
        <Button
          type="primary"
          className="mt-32 w-[200px]"
          onClick={handleConfirm}
          size="large"
        >
          {t('Confirm')}
        </Button>
      </div>
      {isEdit && (
        <Button type="link" onClick={handleRemoveContact}>
          {t('Remove from Contacts')}
        </Button>
      )}
    </Modal>
  );
};

export default EditModal;
