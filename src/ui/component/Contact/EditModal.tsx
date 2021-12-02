import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button, Form, message } from 'antd';
import { useWallet } from 'ui/utils';
import { ContactBookItem } from 'background/service/contactBook';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';
import clsx from 'clsx';

interface EditModalProps {
  address: string;
  visible: boolean;
  onOk(data: ContactBookItem | null, type: string): void;
  onCancel(): void;
  isEdit: boolean;
  accountType: string;
}

const EditModal = ({
  address,
  visible,
  onOk,
  onCancel,
  isEdit = true,
  accountType = 'others',
}: EditModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [name, setName] = useState('');

  const handleConfirm = () => {
    if (!name) return;
    if (isEdit) {
      wallet.updateContact({
        address,
        name,
      });
      wallet.updateAlianName(address.toLowerCase(), name);
    } else {
      wallet.addContact({
        address,
        name,
      });
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Added to Contact'),
        duration: 1,
      });
    }
    onOk({ address, name }, accountType);
  };

  const handleRemoveContact = () => {
    wallet.removeContact(address);
    onOk(null, accountType);
  };

  const strLength = (str) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if ((c >= 0x0001 && c <= 0x007e) || (0xff60 <= c && c <= 0xff9f)) {
        len++;
      } else {
        len += 2;
      }
    }
    return len;
  };

  const handleNameChange = (value: string) => {
    if (strLength(value) > 24) {
      return;
    }
    setName(value);
  };

  const init = async () => {
    if (isEdit) {
      const contact = await wallet.getContactByAddress(address);
      setName(contact.name);
    }
  };

  const handleVisibleChange = async () => {
    if (visible) {
      if (isEdit) {
        const contact = await wallet.getContactByAddress(address);
        setName(contact?.name || '');
      } else {
        setName('');
      }
    }
  };

  useEffect(() => {
    handleVisibleChange();
  }, [visible]);

  useEffect(() => {
    init();
  }, []);
  return (
    <Modal
      className={
        isEdit && accountType === 'others'
          ? 'edit-contact-modal-with-remove'
          : 'edit-contact-modal'
      }
      title={isEdit ? t('Edit address memo') : t('Add address memo')}
      visible={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      footer={null}
      transitionName=""
      maskTransitionName=""
      width="360px"
      destroyOnClose
    >
      <Form onFinish={handleConfirm}>
        <Input
          autoFocus
          allowClear
          value={name}
          style={{ background: '#F5F6FA' }}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </Form>
      <div className="flex justify-center">
        <Button
          type="primary"
          className="mt-32 w-[200px]"
          onClick={handleConfirm}
          size="large"
          disabled={!name}
        >
          {t('Confirm')}
        </Button>
      </div>
      {isEdit && accountType === 'others' && (
        <div className="remove-btn">
          <Button type="link" onClick={handleRemoveContact}>
            {t('Remove from Contacts')}
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default EditModal;
